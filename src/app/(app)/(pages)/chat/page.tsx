import { redirect } from "next/navigation";
import { MessagesSquare, Plus, Bot } from "lucide-react";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewChatLauncher } from "@/components/chat/new-chat-launcher";
import { SessionList } from "@/components/chat/session-list";
import { listSessions } from "@/services/tutorService";
import { listCoursesForUser } from "@/services/courseService";

export const dynamic = "force-dynamic";

export default async function ChatListPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { courseId } = await searchParams;

  const [sessions, courses] = await Promise.all([
    listSessions(session.user.id),
    listCoursesForUser(session.user.id),
  ]);

  const tutorCount = sessions.filter((s) =>
    ["LEARN", "PRACTICE", "REVISION", "DIRECT"].includes(s.mode)
  ).length;
  const assistantCount = sessions.length - tutorCount;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">Chats</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {sessions.length === 0
            ? "Start a tutor chat grounded in your course materials, or use the AI assistant for anything else."
            : `${sessions.length} chat${sessions.length !== 1 ? "s" : ""} · ${tutorCount} tutor · ${assistantCount} assistant`}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── New chat card ────────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              New chat
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose a mode. Tutor chats use your uploaded course notes. Assistant chats work on anything.
            </p>
          </CardHeader>
          <CardContent>
            <NewChatLauncher
              courses={courses.map((c) => ({
                id: c.id,
                title: c.title,
                code: c.code,
                materialsCount: c._count.materials,
              }))}
              defaultCourseId={courseId ?? null}
            />
          </CardContent>
        </Card>

        {/* ── Session list ─────────────────────────────────────── */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessagesSquare className="h-4 w-4 text-violet-500" />
              Your chats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SessionList
              sessions={sessions.map((s) => ({
                id: s.id,
                title: s.title,
                mode: s.mode,
                updatedAt: s.updatedAt,
                course: s.course,
                _count: s._count,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Quick info banner ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">9 modes available</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <strong>Tutor modes</strong> (Learn, Practice, Revision, Direct) — grounded in your uploaded materials with citations.{" "}
              <strong>Assistant modes</strong> (General, Code, Write, Research, Business) — general AI for any task.
              Code and Research use a smarter model automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
