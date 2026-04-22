import Link from "next/link";
import { redirect } from "next/navigation";
import { MessagesSquare, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { NewChatLauncher } from "@/components/chat/new-chat-launcher";
import { listSessions } from "@/services/tutorService";
import { listCoursesForUser } from "@/services/courseService";
import { formatRelativeTime } from "@/lib/utils";

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

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">Tutor chats</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Every chat is grounded in the course you pick — with citations back to the source, not a guess from the model's training data.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Start a new chat
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Pick a course and mode. We'll create the session and drop you in.
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

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessagesSquare className="h-4 w-4 text-violet-500" />
              Your chats
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <EmptyState
                icon={<MessagesSquare className="h-6 w-6" />}
                title="No chats yet"
                description="Start one on the left — pick a course and a tutor mode."
              />
            ) : (
              <ul className="divide-y divide-border/70">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/chat/${s.id}`}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 transition-colors hover:text-primary"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{s.title}</p>
                          <Badge variant="muted">{s.mode.toLowerCase()}</Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.course ? `${s.course.code} · ${s.course.title}` : "General"} · {s._count.messages} messages
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeTime(s.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
