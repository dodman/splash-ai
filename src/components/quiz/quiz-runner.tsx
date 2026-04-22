"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { QuizResponseEntry } from "@/types";

interface Question {
  id: string;
  order: number;
  type: "MCQ" | "SHORT" | "SCENARIO";
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string;
  topic: string | null;
}

interface PreviousAttempt {
  id: string;
  score: number;
  maxScore: number;
  completedAt: Date | null;
}

interface QuizRunnerProps {
  quizId: string;
  questions: Question[];
  previousAttempts: PreviousAttempt[];
}

type Phase = "overview" | "taking" | "review";

export function QuizRunner({ quizId, questions, previousAttempts }: QuizRunnerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>(previousAttempts.length > 0 ? "overview" : "overview");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    graded: QuizResponseEntry[];
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const current = questions[idx];
  const total = questions.length;
  const answered = Object.values(answers).filter((v) => v.trim().length > 0).length;

  const submit = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/quiz/${quizId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            responses: questions.map((q) => ({
              questionId: q.id,
              answer: answers[q.id] ?? "",
            })),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "Submission failed");
        }
        const data = await res.json();
        setResult({
          score: data.score,
          maxScore: data.maxScore,
          graded: data.graded,
        });
        setPhase("review");
        router.refresh();
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Could not submit",
          description: err instanceof Error ? err.message : "Try again.",
        });
      }
    });
  };

  if (phase === "overview") {
    return (
      <OverviewCard
        questions={questions}
        previousAttempts={previousAttempts}
        onStart={() => {
          setAnswers({});
          setIdx(0);
          setPhase("taking");
        }}
      />
    );
  }

  if (phase === "review" && result) {
    return (
      <ReviewCard
        questions={questions}
        result={result}
        onRetake={() => {
          setResult(null);
          setAnswers({});
          setIdx(0);
          setPhase("taking");
        }}
      />
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Question {idx + 1} of {total}
          </span>
          <span className="text-muted-foreground">
            {answered} / {total} answered
          </span>
        </div>
        <Progress value={((idx + 1) / total) * 100} />
      </div>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{current.type.toLowerCase()}</Badge>
            {current.topic && <Badge variant="muted">{current.topic}</Badge>}
          </div>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{current.prompt}</p>

          {current.type === "MCQ" ? (
            <div className="grid gap-2">
              {(current.options ?? []).map((opt) => {
                const selected = answers[current.id] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, [current.id]: opt }))}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                      selected
                        ? "border-primary/60 bg-primary/5 shadow-sm shadow-primary/10"
                        : "hover:border-primary/30 hover:bg-accent"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                        selected ? "border-primary" : "border-muted-foreground/30"
                      )}
                    >
                      {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                    <span className="text-sm">{opt}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <Textarea
              value={answers[current.id] ?? ""}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [current.id]: e.target.value }))
              }
              placeholder={
                current.type === "SCENARIO"
                  ? "Walk through your reasoning step by step…"
                  : "Write your answer…"
              }
              rows={6}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        {idx < total - 1 ? (
          <Button variant="default" onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="gradient" onClick={submit} disabled={pending || answered === 0}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit quiz
          </Button>
        )}
      </div>
    </div>
  );
}

function OverviewCard({
  questions,
  previousAttempts,
  onStart,
}: {
  questions: Question[];
  previousAttempts: PreviousAttempt[];
  onStart: () => void;
}) {
  const types = useMemo(() => {
    const c: Record<string, number> = {};
    for (const q of questions) c[q.type] = (c[q.type] ?? 0) + 1;
    return c;
  }, [questions]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <h2 className="font-serif text-xl">Ready when you are.</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {questions.length} questions — mix of{" "}
              {Object.entries(types)
                .map(([t, n]) => `${n} ${t.toLowerCase()}`)
                .join(", ")}
              . You'll get explanations for every question once you submit.
            </p>
          </div>
          <Button onClick={onStart} variant="gradient" size="lg">
            Start quiz
          </Button>
        </CardContent>
      </Card>

      {previousAttempts.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h3 className="text-sm font-semibold">Previous attempts</h3>
            <ul className="space-y-2">
              {previousAttempts.slice(0, 5).map((a) => {
                const pct = Math.round((a.score / a.maxScore) * 100);
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span>
                      {a.score} / {a.maxScore}{" "}
                      <Badge
                        variant={pct >= 70 ? "success" : pct >= 40 ? "warn" : "destructive"}
                      >
                        {pct}%
                      </Badge>
                    </span>
                    {a.completedAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(a.completedAt)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReviewCard({
  questions,
  result,
  onRetake,
}: {
  questions: Question[];
  result: { score: number; maxScore: number; graded: QuizResponseEntry[] };
  onRetake: () => void;
}) {
  const pct = Math.round((result.score / result.maxScore) * 100);
  const gradedById = new Map(result.graded.map((g) => [g.questionId, g]));
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-brand text-white shadow-lg shadow-primary/20">
            <span className="font-serif text-xl">{pct}%</span>
          </div>
          <div>
            <p className="font-serif text-2xl">
              {result.score} / {result.maxScore}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {pct >= 85
                ? "Excellent — you've got a strong grip."
                : pct >= 65
                ? "Solid. Review the misses and run it again."
                : pct >= 40
                ? "Getting there. Weak topics were logged to your progress."
                : "Plenty to revisit — the tutor will prioritise these topics next session."}
            </p>
          </div>
          <Button variant="outline" onClick={onRetake}>
            Retake quiz
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {questions.map((q, i) => {
          const g = gradedById.get(q.id);
          const correct = g?.correct;
          return (
            <Card key={q.id} className={cn(!correct && "border-destructive/40")}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Q{i + 1}</span>
                    <Badge variant="muted">{q.type.toLowerCase()}</Badge>
                    {q.topic && <Badge variant="info">{q.topic}</Badge>}
                  </div>
                  {correct ? (
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3" />
                      Correct
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3" />
                      {(g?.pointsAwarded ?? 0) > 0 ? "Partial" : "Missed"}
                    </Badge>
                  )}
                </div>

                <p className="text-sm leading-relaxed">{q.prompt}</p>

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Your answer
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {g?.answer || <em className="text-muted-foreground">No answer</em>}
                    </p>
                  </div>
                  {!correct && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Expected
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{q.correctAnswer}</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Explanation
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {g?.feedback || q.explanation}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
