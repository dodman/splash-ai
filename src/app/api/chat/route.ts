import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import {
  buildTutorContext,
  persistUserMessage,
  persistAssistantMessage,
  generateSessionTitle,
} from "@/services/tutorService";
import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/providers/ai";
import { handleApiError } from "@/lib/errors";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  sessionId: z.string().cuid(),
  message: z.string().trim().min(1).max(12000), // raised limit for pasted code/text
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    rateLimit(`chat:${userId}`, LIMITS.chat);

    const body = await req.json();
    const { sessionId, message } = bodySchema.parse(body);

    await persistUserMessage({ sessionId, content: message });

    const { session, system, messages, citations, mode } = await buildTutorContext({
      userId,
      sessionId,
      userMessage: message,
    });

    // Auto-generate a better title on the first user message
    const userMessageCount = await prisma.chatMessage.count({
      where: { sessionId, role: "USER" },
    });
    if (userMessageCount === 1) {
      generateSessionTitle(message, mode)
        .then((title) =>
          prisma.chatSession.update({ where: { id: session.id }, data: { title } })
        )
        .catch(() => {});
    }

    const ai = getAIProvider();
    // Smart model routing: smarter model for CODE & RESEARCH, fast model for rest
    const selectedModel = ai.selectModel(mode, message.length);

    const encoder = new TextEncoder();
    let assembled = "";
    let tokenCount = 0;

    const streamIterable = ai.chatStream({
      system,
      messages,
      temperature: 0.5,
      model: selectedModel,
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // First frame: citation metadata + model used (for debugging)
          const meta = JSON.stringify({ type: "meta", citations, model: selectedModel });
          controller.enqueue(encoder.encode(`event: meta\ndata: ${meta}\n\n`));

          for await (const delta of streamIterable) {
            assembled += delta;
            const payload = JSON.stringify({ type: "delta", text: delta });
            controller.enqueue(encoder.encode(`event: delta\ndata: ${payload}\n\n`));
          }

          // Capture token usage if available
          if ("usagePromise" in streamIterable && streamIterable.usagePromise) {
            const usage = await streamIterable.usagePromise.catch(() => null);
            if (usage) tokenCount = usage.totalTokens;
          }

          await persistAssistantMessage({
            sessionId: session.id,
            content: assembled,
            citations,
            tokensUsed: tokenCount || undefined,
          });

          const done = JSON.stringify({ type: "done", tokensUsed: tokenCount || undefined });
          controller.enqueue(encoder.encode(`event: done\ndata: ${done}\n\n`));
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Streaming failed";
          const errPayload = JSON.stringify({ type: "error", error: msg });
          controller.enqueue(encoder.encode(`event: error\ndata: ${errPayload}\n\n`));
          if (assembled) {
            await persistAssistantMessage({
              sessionId,
              content: assembled + "\n\n_(reply interrupted: " + msg + ")_",
              citations,
            }).catch(() => {});
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    // Surface the real error message so we can diagnose production issues.
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/chat outer]", msg, err);
    return handleApiError(err);
  }
}
