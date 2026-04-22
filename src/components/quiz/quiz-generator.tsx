"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Course = { id: string; title: string; code: string; materialsCount: number };
type QType = "MCQ" | "SHORT" | "SCENARIO";

const TYPE_LABELS: Record<QType, { label: string; hint: string }> = {
  MCQ: { label: "Multiple choice", hint: "Fast, auto-graded" },
  SHORT: { label: "Short answer", hint: "AI-graded with feedback" },
  SCENARIO: { label: "Scenario", hint: "Applied problem-solving" },
};

export function QuizGenerator({
  courses,
  defaultCourseId,
}: {
  courses: Course[];
  defaultCourseId?: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [courseId, setCourseId] = useState<string>(
    defaultCourseId || courses[0]?.id || ""
  );
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("5");
  const [types, setTypes] = useState<QType[]>(["MCQ", "SHORT"]);

  const toggleType = (t: QType) => {
    setTypes((prev) =>
      prev.includes(t) ? (prev.length > 1 ? prev.filter((x) => x !== t) : prev) : [...prev, t]
    );
  };

  const generate = () => {
    if (courses.length === 0) {
      toast({
        variant: "destructive",
        title: "No courses ready",
        description: "Upload some materials to a course first.",
      });
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/quiz/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            topic: topic || undefined,
            count: Number(count),
            types,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "Quiz generation failed");
        }
        const { quiz } = await res.json();
        toast({
          title: "Quiz ready",
          description: `${quiz.questions.length} questions generated.`,
        });
        router.push(`/quiz/${quiz.id}`);
        router.refresh();
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Could not generate",
          description: err instanceof Error ? err.message : "Try again.",
        });
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="course">Course</Label>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger id="course" disabled={courses.length === 0}>
            <SelectValue
              placeholder={
                courses.length === 0 ? "Add materials to a course first" : "Pick a course"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code} · {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="topic">
          Topic <span className="text-xs text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Porter's Five Forces"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="count">Number of questions</Label>
        <Select value={count} onValueChange={setCount}>
          <SelectTrigger id="count">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[3, 5, 7, 10, 15].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} questions
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Question types</Label>
        <div className="grid gap-2">
          {(Object.keys(TYPE_LABELS) as QType[]).map((t) => {
            const on = types.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-3 text-left text-sm transition-all",
                  on
                    ? "border-primary/60 bg-primary/5"
                    : "hover:border-primary/30 hover:bg-accent"
                )}
              >
                <div>
                  <p className="font-medium">{TYPE_LABELS[t].label}</p>
                  <p className="text-xs text-muted-foreground">{TYPE_LABELS[t].hint}</p>
                </div>
                <span
                  className={cn(
                    "h-5 w-5 rounded-md border-2 transition-all",
                    on ? "border-primary bg-primary" : "border-muted-foreground/30"
                  )}
                >
                  {on && (
                    <svg
                      viewBox="0 0 20 20"
                      fill="white"
                      className="h-full w-full p-0.5"
                      aria-hidden
                    >
                      <path d="M7.629 13.23l-3.3-3.297L2.91 11.35l4.719 4.72 10.11-10.112-1.414-1.414z" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Button
        variant="gradient"
        size="lg"
        className="w-full"
        onClick={generate}
        disabled={pending || courses.length === 0}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Generate quiz
      </Button>
    </div>
  );
}
