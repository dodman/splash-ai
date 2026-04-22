import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { QuizGenerator } from "@/components/quiz/quiz-generator";
import { listQuizzes } from "@/services/quizService";
import { listCoursesForUser } from "@/services/courseService";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QuizListPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { courseId } = await searchParams;

  const [quizzes, courses] = await Promise.all([
    listQuizzes(session.user.id),
    listCoursesForUser(session.user.id),
  ]);

  const coursesWithReadyMaterials = courses.filter((c) => c._count.materials > 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">Quizzes</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Quiz yourself with AI-generated questions drawn from your own materials. Every question is cited; every wrong answer becomes a teaching moment.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-fuchsia-500" />
              Generate a quiz
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Pick a course, optionally a topic, and the tutor writes a quiz from your materials.
            </p>
          </CardHeader>
          <CardContent>
            <QuizGenerator
              courses={coursesWithReadyMaterials.map((c) => ({
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
              <ClipboardCheck className="h-4 w-4 text-fuchsia-500" />
              Your quizzes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quizzes.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck className="h-6 w-6" />}
                title="No quizzes yet"
                description="Generate your first quiz on the left. We'll build 3–15 questions from your uploaded materials."
              />
            ) : (
              <ul className="divide-y divide-border/70">
                {quizzes.map((q) => {
                  const last = q.attempts[0];
                  const percent = last
                    ? Math.round((last.score / last.maxScore) * 100)
                    : null;
                  return (
                    <li key={q.id}>
                      <Link
                        href={`/quiz/${q.id}`}
                        className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 transition-colors hover:text-primary"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{q.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {q.course ? `${q.course.code} · ${q.course.title}` : "General"} · {q._count.questions} questions · {q._count.attempts} attempts
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {percent !== null ? (
                            <Badge variant={percent >= 70 ? "success" : percent >= 40 ? "warn" : "destructive"}>
                              {percent}%
                            </Badge>
                          ) : (
                            <Badge variant="muted">New</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(q.createdAt)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
