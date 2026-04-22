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
  message: z.string().trim().min(1).max(8000),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    rateLimit(`chat:${userId}`, LIMITS.chat);

    const body = await req.json();
    const { sessionId, message } = bodySchema.parse(body);

    await persistUserMessage({ sessionId, content: message });

    const { session, system, messages, citations } = await buildTutorContext({
      userId,
      sessionId,
      userMessage: message,
    });

    // If this is the first real user message, generate a better title in the background.
    const userMessageCount = await prisma.chatMessage.count({
      where: { sessionId, role: "USER" },
    });
    if (userMessageCount === 1) {
      generateSessionTitle(message)
        .then((title) =>
          prisma.chatSession.update({ where: { id: session.id }, data: { title } })
        )
        .catch(() => {});
    }

    const ai = getAIProvider();

    const encoder = new TextEncoder();
    let assembled = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // First frame: citation metadata as a JSON event.
          const meta = JSON.stringify({ type: "meta", citations });
          controller.enqueue(encoder.encode(`event: meta\ndata: ${meta}\n\n`));

          for await (const delta of ai.chatStream({
            system,
            messages,
            temperature: 0.5,
          })) {
            assembled += delta;
            const payload = JSON.stringify({ type: "delta", text: delta });
            controller.enqueue(encoder.encode(`event: delta\ndata: ${payload}\n\n`));
          }

          await persistAssistantMessage({
            sessionId: session.id,
            content: assembled,
            citations,
          });

          const done = JSON.stringify({ type: "done" });
          controller.enqueue(encoder.encode(`event: done\ndata: ${done}\n\n`));
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Streaming failed";
          const errPayload = JSON.stringify({ type: "error", error: msg });
          controller.enqueue(encoder.encode(`event: error\ndata: ${errPayload}\n\n`));
          // Persist whatever we have so the user doesn't lose it.
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
    return handleApiError(err);
  }
}
