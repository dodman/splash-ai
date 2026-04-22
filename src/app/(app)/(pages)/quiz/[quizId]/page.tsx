import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getQuizForUser } from "@/services/quizService";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { QuizRunner } from "@/components/quiz/quiz-runner";

export const dynamic = "force-dynamic";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { quizId } = await params;

  let quiz;
  try {
    quiz = await getQuizForUser(session.user.id, quizId);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ForbiddenError) notFound();
    throw err;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/quiz${quiz.courseId ? `?courseId=${quiz.courseId}` : ""}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to quizzes
        </Link>
      </div>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {quiz.course && <Badge variant="default">{quiz.course.code}</Badge>}
          <Badge variant="muted">{quiz.questions.length} questions</Badge>
          {quiz.topic && <Badge variant="info">{quiz.topic}</Badge>}
        </div>
        <h1 className="font-serif text-3xl tracking-tight">{quiz.title}</h1>
        {quiz.course && (
          <p className="text-sm text-muted-foreground">Grounded in {quiz.course.title}</p>
        )}
      </header>

      <QuizRunner
        quizId={quiz.id}
        questions={quiz.questions.map((q) => ({
          id: q.id,
          order: q.order,
          type: q.type,
          prompt: q.prompt,
          options: Array.isArray(q.options) ? (q.options as string[]) : null,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          topic: q.topic,
        }))}
        previousAttempts={quiz.attempts.map((a) => ({
          id: a.id,
          score: a.score,
          maxScore: a.maxScore,
          completedAt: a.completedAt,
        }))}
      />
    </div>
  );
}
