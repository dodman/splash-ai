import { redirect } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Clock,
  ClipboardCheck,
  Flame,
  MessagesSquare,
  Star,
  Target,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressActions } from "@/components/dashboard/progress-actions";
import { getProgressSummary } from "@/services/progressService";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const summary = await getProgressSummary(session.user.id);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">Progress</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            What you've covered, what needs another pass, and where your confidence is climbing.
          </p>
        </div>
        <ProgressActions />
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

      {/* ── Per-course progress ──────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 font-serif text-xl">Course progress</h2>
        {summary.courseProgress.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <EmptyState
                icon={<BookOpen className="h-5 w-5" />}
                title="No courses yet"
                description="Create a course and take some quizzes to see per-course progress here."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {summary.courseProgress.map((cp) => (
              <Card key={cp.courseId}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-indigo-500" />
                      {cp.courseCode} · {cp.courseTitle}
                    </span>
                    {cp.topics.length > 0 && (
                      <span className="text-sm font-normal text-muted-foreground">
                        {Math.round(cp.averageMastery * 100)}% avg
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cp.topics.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No topics tracked yet. Take a quiz on this course to start building topic mastery.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {cp.topics.map((t) => (
                        <li key={t.topic} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="truncate font-medium">{t.topic}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {Math.round(t.mastery * 100)}%
                            </span>
                          </div>
                          <Progress value={t.mastery * 100} />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-fuchsia-500" />
              Focus areas
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Topics where mastery is still below 60%.
            </p>
          </CardHeader>
          <CardContent>
            {summary.weakTopics.length === 0 ? (
              <EmptyState
                icon={<BarChart3 className="h-5 w-5" />}
                title="Nothing flagged yet"
                description="Once you take a quiz or chat through a few topics, weak areas will appear here."
              />
            ) : (
              <ul className="space-y-4">
                {summary.weakTopics.map((t) => (
                  <li key={t.topic} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{t.topic}</span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(t.mastery * 100)}% mastery
                      </span>
                    </div>
                    <Progress value={t.mastery * 100} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-4 w-4 text-emerald-500" />
              Strong topics
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Topics where you're consistently scoring 70%+.
            </p>
          </CardHeader>
          <CardContent>
            {summary.strongTopics.length === 0 ? (
              <EmptyState
                icon={<Star className="h-5 w-5" />}
                title="Build some mastery"
                description="Score consistently on a topic and it'll show up here."
              />
            ) : (
              <ul className="space-y-4">
                {summary.strongTopics.map((t) => (
                  <li key={t.topic} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{t.topic}</span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        {Math.round(t.mastery * 100)}% mastery
                      </span>
                    </div>
                    <Progress value={t.mastery * 100} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <RecentActivity items={summary.recentActivity} />
      </section>
    </div>
  );
}
