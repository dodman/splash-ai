import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSession } from "@/services/tutorService";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ChatWindow } from "@/components/chat/chat-window";
import type { Citation } from "@/types";

export const dynamic = "force-dynamic";

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const authSession = await auth();
  if (!authSession?.user?.id) redirect("/login");
  const { sessionId } = await params;

  let chat;
  try {
    chat = await getSession(authSession.user.id, sessionId);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ForbiddenError) notFound();
    throw err;
  }

  const hasMaterials = chat.courseId
    ? (await prisma.courseMaterial.count({
        where: { courseId: chat.courseId, status: "READY" },
      })) > 0
    : false;

  const initialMessages = chat.messages
    .filter((m) => m.role !== "SYSTEM")
    .map((m) => ({
      id: m.id,
      role: m.role as "USER" | "ASSISTANT",
      content: m.content,
      citations: Array.isArray(m.citations) ? (m.citations as unknown as Citation[]) : undefined,
    }));

  return (
    <ChatWindow
      sessionId={chat.id}
      sessionTitle={chat.title}
      initialMode={chat.mode}
      initialMessages={initialMessages}
      course={
        chat.course
          ? { id: chat.course.id, title: chat.course.title, code: chat.course.code }
          : null
      }
      hasMaterials={hasMaterials}
      user={{
        name: authSession.user.name,
        email: authSession.user.email,
      }}
    />
  );
}
