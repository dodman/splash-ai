import Link from "next/link";
import {
  BookOpen,
  Clock,
  ClipboardCheck,
  Flame,
  MessagesSquare,
  Plus,
  Sparkles,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { WeakTopics } from "@/components/dashboard/weak-topics";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { listCoursesForUser } from "@/services/courseService";
import { getProgressSummary } from "@/services/progressService";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [courses, summary, recentSessions] = await Promise.all([
    listCoursesForUser(userId),
    getProgressSummary(userId),
    prisma.chatSession.findMany({
      where: { userId },
      include: { course: { select: { title: true, code: true } } },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
  ]);

  const firstName =
    session.user.name?.split(" ")[0] ||
    session.user.email?.split("@")[0] ||
    "there";

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl">
            Welcome back, <span className="text-gradient">{firstName}</span>.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Pick up a tutor chat, run a quiz, or start a new course. Splash grounds every answer in your uploaded lectures.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="gradient" size="lg">
            <Link href="/chat">
              <Sparkles className="h-4 w-4" />
              New tutor chat
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/courses/new">
              <Plus className="h-4 w-4" />
              New course
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Hours studied"
          value={summary.hoursStudied}
          hint="across all courses"
          icon={Clock}
          accent="indigo"
        />
        <StatCard
          label="Sessions"
          value={summary.sessionsCompleted}
          hint="tutor conversations"
          icon={MessagesSquare}
          accent="violet"
        />
        <StatCard
          label="Quiz average"
          value={summary.quizzesCompleted > 0 ? `${summary.averageScore}%` : "—"}
          hint={`${summary.quizzesCompleted} attempted`}
          icon={ClipboardCheck}
          accent="fuchsia"
        />
        <StatCard
          label="Day streak"
          value={summary.streakDays}
          hint={summary.streakDays === 1 ? "day active" : "days in a row"}
          icon={Flame}
          accent="emerald"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-violet-500" />
                  Your courses
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {courses.length === 0
                    ? "Start by adding your first course."
                    : `You're enrolled in ${courses.length} ${courses.length === 1 ? "course" : "courses"}.`}
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/courses">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {courses.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className="h-6 w-6" />}
                  title="No courses yet"
                  description="Add your first course, upload a syllabus or lecture notes, and start studying."
                  action={
                    <Button asChild variant="gradient">
                      <Link href="/courses/new">
                        <Plus className="h-4 w-4" />
                        Add a course
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {courses.slice(0, 4).map((course) => (
                    <li key={course.id}>
                      <Link
                        href={`/courses/${course.id}`}
                        className="group flex flex-col gap-2 rounded-xl border bg-card/50 p-4 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold group-hover:text-primary">
                              {course.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {course.code} · {course.degree} · Y{course.year}S{course.semester}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>{course._count.materials} materials</span>
                          <span>·</span>
                          <span>{course._count.chatSessions} sessions</span>
                          <span>·</span>
                          <span>{course._count.quizzes} quizzes</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessagesSquare className="h-4 w-4 text-indigo-500" />
                  Recent tutor chats
                </CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/chat">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Start a chat from any course to get a tutor that teaches, not a bot that dumps answers.
                </p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {recentSessions.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/chat/${s.id}`}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:text-primary"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{s.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.course ? s.course.title : "General"} · {s.mode.toLowerCase()} mode
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

        <div className="space-y-6">
          <WeakTopics topics={summary.weakTopics} />
          <RecentActivity items={summary.recentActivity} />
        </div>
      </section>
    </div>
  );
}
