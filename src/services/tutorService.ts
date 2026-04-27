import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/providers/ai";
import { similaritySearch } from "./retrievalService";
import { composeTutorPrompt } from "@/prompts/builder";
import { composeAssistantPrompt } from "@/prompts/assistant-builder";
import { isTutorMode } from "@/lib/modes";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { TutorMode } from "@prisma/client";
import type { AIMessage, Citation, RetrievedChunk } from "@/types";

/** How many recent messages to include in context window */
const SESSION_CONTEXT_MESSAGES = 20;

// ── Session CRUD ──────────────────────────────────────────────────────────────

export async function createSession(params: {
  userId: string;
  courseId?: string | null;
  mode: TutorMode;
  title?: string;
}) {
  if (params.courseId) {
    const course = await prisma.course.findUnique({ where: { id: params.courseId } });
    if (!course) throw new NotFoundError("Course not found");
    if (course.ownerId !== params.userId) {
      const enrolled = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: params.userId, courseId: params.courseId } },
      });
      if (!enrolled) throw new ForbiddenError();
    }
  }

  return prisma.chatSession.create({
    data: {
      userId: params.userId,
      courseId: params.courseId ?? null,
      mode: params.mode,
      title: params.title?.trim() || "New chat",
    },
  });
}

export async function listSessions(userId: string, courseId?: string | null) {
  return prisma.chatSession.findMany({
    where: {
      userId,
      ...(courseId !== undefined ? { courseId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      course: { select: { id: true, title: true, code: true } },
      _count: { select: { messages: true } },
    },
    take: 100,
  });
}

export async function getSession(userId: string, sessionId: string) {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      course: true,
    },
  });
  if (!session) throw new NotFoundError("Chat session not found");
  if (session.userId !== userId) throw new ForbiddenError();
  return session;
}

export async function deleteSession(userId: string, sessionId: string) {
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new NotFoundError();
  if (session.userId !== userId) throw new ForbiddenError();
  await prisma.chatSession.delete({ where: { id: sessionId } });
}

export async function updateSessionMeta(params: {
  userId: string;
  sessionId: string;
  title?: string;
  mode?: TutorMode;
}) {
  const session = await prisma.chatSession.findUnique({ where: { id: params.sessionId } });
  if (!session) throw new NotFoundError();
  if (session.userId !== params.userId) throw new ForbiddenError();
  return prisma.chatSession.update({
    where: { id: params.sessionId },
    data: {
      title: params.title?.trim() || undefined,
      mode: params.mode,
    },
  });
}

// ── Context builder ───────────────────────────────────────────────────────────

/**
 * Build the full runtime context for a reply.
 * - Tutor modes (LEARN/PRACTICE/REVISION/DIRECT): RAG + pedagogy prompts
 * - Assistant modes (GENERAL/CODE/WRITE/RESEARCH/BUSINESS): no RAG, identity prompts
 */
export async function buildTutorContext(params: {
  userId: string;
  sessionId: string;
  userMessage: string;
}) {
  const session = await getSession(params.userId, params.sessionId);
  const isAssistant = !isTutorMode(session.mode as Parameters<typeof isTutorMode>[0]);

  const [settings, weakTopics] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId: params.userId } }),
    isAssistant
      ? Promise.resolve([]) // assistant modes don't use weak topics
      : prisma.topicProgress.findMany({
          where: {
            userId: params.userId,
            courseId: session.courseId ?? undefined,
            mastery: { lt: 0.5 },
          },
          orderBy: { mastery: "asc" },
          take: 5,
          select: { topic: true },
        }),
  ]);

  const level = settings?.level ?? "INTERMEDIATE";
  const preferredLength = settings?.preferredLength ?? "NORMAL";

  // ── RAG retrieval (tutor modes only) ──────────────────────────────────────
  const retrievedChunks: RetrievedChunk[] = !isAssistant && session.courseId
    ? await similaritySearch({
        courseId: session.courseId,
        query: params.userMessage,
        k: 8, // slightly more chunks for better coverage
      })
    : [];

  // ── System prompt ──────────────────────────────────────────────────────────
  let system: string;
  let contextMessage: string;

  if (isAssistant) {
    // Pure assistant — no RAG, mode-specific identity
    system = composeAssistantPrompt({
      mode: session.mode as TutorMode,
      level,
      preferredLength,
      courseName: session.course?.title ?? null,
    });
    contextMessage = ""; // no context preamble needed for assistant modes
  } else {
    // Tutor mode — pedagogy + RAG
    const built = composeTutorPrompt({
      mode: session.mode as TutorMode,
      level,
      preferredLength,
      course: session.course
        ? {
            title: session.course.title,
            code: session.course.code,
            degree: session.course.degree,
          }
        : null,
      weakTopics: weakTopics.map((w) => w.topic),
      retrievedChunks,
    });
    system = built.system;
    contextMessage = built.contextMessage;
  }

  // ── Conversation history ───────────────────────────────────────────────────
  const history: AIMessage[] = session.messages
    .slice(-SESSION_CONTEXT_MESSAGES)
    .filter((m) => m.role !== "SYSTEM")
    .map((m) => ({
      role: m.role === "ASSISTANT" ? "assistant" : "user",
      content: m.content,
    }));

  let messages: AIMessage[];
  if (isAssistant) {
    // Simple conversation — no context message injection
    messages = [...history, { role: "user", content: params.userMessage }];
  } else {
    // Tutor — inject RAG context as a priming exchange
    messages = [
      { role: "user", content: contextMessage },
      { role: "assistant", content: "Understood. I have the course context and sources ready." },
      ...history,
      { role: "user", content: params.userMessage },
    ];
  }

  const citations: Citation[] = retrievedChunks.map((c, i) => ({
    index: i + 1,
    materialId: c.materialId,
    filename: c.filename,
    page: c.page,
    chunkIndex: c.chunkIndex,
    excerpt: c.content.slice(0, 400),
  }));

  return {
    session,
    system,
    messages,
    citations,
    isAssistant,
    mode: session.mode,
  };
}

// ── Message persistence ───────────────────────────────────────────────────────

export async function persistUserMessage(params: {
  sessionId: string;
  content: string;
}) {
  return prisma.chatMessage.create({
    data: {
      sessionId: params.sessionId,
      role: "USER",
      content: params.content,
    },
  });
}

export async function persistAssistantMessage(params: {
  sessionId: string;
  content: string;
  citations: Citation[];
  tokensUsed?: number;
}) {
  await Promise.all([
    prisma.chatMessage.create({
      data: {
        sessionId: params.sessionId,
        role: "ASSISTANT",
        content: params.content,
        citations: params.citations as never,
        tokensUsed: params.tokensUsed ?? null,
      },
    }),
    prisma.chatSession.update({
      where: { id: params.sessionId },
      data: {
        updatedAt: new Date(),
        ...(params.tokensUsed
          ? { totalTokensUsed: { increment: params.tokensUsed } }
          : {}),
      },
    }),
  ]);
}

// ── Title generation ──────────────────────────────────────────────────────────

export async function generateSessionTitle(firstMessage: string, mode?: string): Promise<string> {
  try {
    const ai = getAIProvider();
    const isCodeMode = mode === "CODE";
    const system = isCodeMode
      ? "Generate a concise 3–6 word title for a coding chat based on the user's first message. Return ONLY the title, no quotes, no punctuation at the end."
      : "Generate a concise 3–6 word title for an AI chat based on the user's first message. Return ONLY the title, no quotes, no punctuation at the end.";

    const text = await ai.chatText({
      system,
      messages: [{ role: "user", content: firstMessage.slice(0, 500) }],
      temperature: 0.3,
      maxTokens: 20,
    });
    return text.replace(/["'.]+/g, "").trim().slice(0, 80) || "New chat";
  } catch {
    return firstMessage.slice(0, 50).trim() || "New chat";
  }
}
