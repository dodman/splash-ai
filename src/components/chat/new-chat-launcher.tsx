"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { MODE_META, type TutorMode } from "@/lib/modes";

type Course = { id: string; title: string; code: string; materialsCount: number };

export function NewChatLauncher({
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
  const [mode, setMode] = useState<TutorMode>("LEARN");

  const go = () => {
    if (courses.length === 0) {
      toast({
        variant: "destructive",
        title: "No courses yet",
        description: "Create a course first so the tutor has materials to work with.",
      });
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: courseId || null,
            mode,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "Could not create session");
        }
        const { session } = await res.json();
        router.push(`/chat/${session.id}`);
        router.refresh();
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Could not start chat",
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
              placeholder={courses.length === 0 ? "No courses available" : "Pick a course"}
            />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code} · {c.title}
                {c.materialsCount === 0 ? " (no materials yet)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Tutor mode</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(MODE_META) as TutorMode[]).map((m) => {
            const meta = MODE_META[m];
            const Icon = meta.icon;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                  mode === m
                    ? "border-primary/60 bg-primary/5 shadow-sm shadow-primary/10"
                    : "hover:border-primary/30 hover:bg-accent"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    mode === m
                      ? "bg-gradient-brand text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{meta.tagline}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Button
        variant="gradient"
        size="lg"
        className="w-full"
        onClick={go}
        disabled={pending || courses.length === 0}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Start tutoring
      </Button>
    </div>
  );
}
