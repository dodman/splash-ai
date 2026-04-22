import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/providers/ai";
import { similaritySearch } from "./retrievalService";
import { composeTutorPrompt } from "@/prompts/builder";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { TutorMode } from "@prisma/client";
import type { AIMessage, Citation, RetrievedChunk } from "@/types";

const SESSION_CONTEXT_MESSAGES = 12;

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
    take: 50,
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

/**
 * Build the full runtime context for a tutor reply: system prompt, context
 * message, conversation history, retrieved chunks, citations.
 */
export async function buildTutorContext(params: {
  userId: string;
  sessionId: string;
  userMessage: string;
}) {
  const session = await getSession(params.userId, params.sessionId);

  const [settings, weakTopics] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId: params.userId } }),
    prisma.topicProgress.findMany({
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

  const retrievedChunks: RetrievedChunk[] = session.courseId
    ? await similaritySearch({
        courseId: session.courseId,
        query: params.userMessage,
        k: 6,
      })
    : [];

  const { system, contextMessage } = composeTutorPrompt({
    mode: session.mode,
    level,
    preferredLength,
    course: session.course
      ? { title: session.course.title, code: session.course.code, degree: session.course.degree }
      : null,
    weakTopics: weakTopics.map((w) => w.topic),
    retrievedChunks,
  });

  const history: AIMessage[] = session.messages
    .slice(-SESSION_CONTEXT_MESSAGES)
    .filter((m) => m.role !== "SYSTEM")
    .map((m) => ({
      role: m.role === "ASSISTANT" ? "assistant" : "user",
      content: m.content,
    }));

  const messages: AIMessage[] = [
    { role: "user", content: contextMessage },
    { role: "assistant", content: "Understood. I have the sources. Ready to help." },
    ...history,
    { role: "user", content: params.userMessage },
  ];

  const citations: Citation[] = retrievedChunks.map((c, i) => ({
    index: i + 1,
    materialId: c.materialId,
    filename: c.filename,
    page: c.page,
    chunkIndex: c.chunkIndex,
    excerpt: c.content.slice(0, 400),
  }));

  return { session, system, messages, citations };
}

/** Persist the user's message and return its id so the client can render immediately. */
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

/** Persist the assistant's full reply after streaming finishes. */
export async function persistAssistantMessage(params: {
  sessionId: string;
  content: string;
  citations: Citation[];
}) {
  await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        sessionId: params.sessionId,
        role: "ASSISTANT",
        content: params.content,
        citations: params.citations as any,
      },
    }),
    prisma.chatSession.update({
      where: { id: params.sessionId },
      data: { updatedAt: new Date() },
    }),
  ]);
}

/** Generate a 3–6 word session title from the first user message. */
export async function generateSessionTitle(firstMessage: string): Promise<string> {
  try {
    const ai = getAIProvider();
    const text = await ai.chatText({
      system:
        "You generate a concise 3–6 word title for a tutoring chat based on the student's first message. Return ONLY the title, no quotes, no punctuation at the end.",
      messages: [{ role: "user", content: firstMessage.slice(0, 500) }],
      temperature: 0.3,
      maxTokens: 20,
    });
    return text.replace(/["'.]+/g, "").trim().slice(0, 80) || "New chat";
  } catch {
    return firstMessage.slice(0, 50).trim() || "New chat";
  }
}
