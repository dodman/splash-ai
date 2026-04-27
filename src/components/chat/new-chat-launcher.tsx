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
import { MODE_META, TUTOR_MODES, ASSISTANT_MODES, isTutorMode, type TutorMode } from "@/lib/modes";

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
  const [mode, setMode] = useState<TutorMode>("GENERAL");

  const needsCourse = isTutorMode(mode);

  const go = () => {
    if (needsCourse && courses.length === 0) {
      toast({
        variant: "destructive",
        title: "No courses yet",
        description: "Create a course first so the tutor can cite your materials.",
      });
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: needsCourse ? (courseId || null) : null,
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
      {/* ── Tutor modes ───────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tutor modes — grounded in your notes
        </Label>
        <div className="grid grid-cols-2 gap-1.5">
          {TUTOR_MODES.map((m) => (
            <ModeCard key={m} mode={m} selected={mode === m} onSelect={setMode} />
          ))}
        </div>
      </div>

      {/* Course picker (only for tutor modes) */}
      {needsCourse && (
        <div className="space-y-2">
          <Label htmlFor="course">Course</Label>
          <Select
            value={courseId}
            onValueChange={setCourseId}
            disabled={courses.length === 0}
          >
            <SelectTrigger id="course">
              <SelectValue
                placeholder={
                  courses.length === 0 ? "No courses — create one first" : "Pick a course"
                }
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
      )}

      {/* ── Assistant modes ────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          AI assistant — general purpose
        </Label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {ASSISTANT_MODES.map((m) => (
            <ModeCard key={m} mode={m} selected={mode === m} onSelect={setMode} />
          ))}
        </div>
      </div>

      {/* ── Launch button ──────────────────────────────────────────── */}
      <Button
        variant="gradient"
        size="lg"
        className="w-full"
        onClick={go}
        disabled={pending || (needsCourse && courses.length === 0)}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {needsCourse ? "Start tutor chat" : "Start chat"}
      </Button>
    </div>
  );
}

function ModeCard({
  mode,
  selected,
  onSelect,
}: {
  mode: TutorMode;
  selected: boolean;
  onSelect: (m: TutorMode) => void;
}) {
  const meta = MODE_META[mode];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={cn(
        "group flex items-start gap-2 rounded-xl border p-2.5 text-left transition-all",
        selected
          ? "border-primary/60 bg-primary/5 shadow-sm shadow-primary/10"
          : "hover:border-primary/30 hover:bg-accent"
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-gradient-brand text-white" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold leading-tight">{meta.label}</p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{meta.tagline}</p>
      </div>
    </button>
  );
}
