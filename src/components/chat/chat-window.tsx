"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Sparkles, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Message } from "./message";
import { Composer } from "./composer";
import { ModeSwitcher } from "./mode-switcher";
import { SourceDrawer } from "./source-drawer";
import { useChatSession, type ChatMessage } from "@/hooks/use-chat-session";
import { useToast } from "@/hooks/use-toast";
import { MODE_META, isTutorMode, isAssistantMode, type TutorMode } from "@/lib/modes";
import type { Citation } from "@/types";

interface ChatWindowProps {
  sessionId: string;
  initialMode: TutorMode;
  initialMessages: ChatMessage[];
  user: { name?: string | null; email?: string | null };
  course?: { id: string; title: string; code: string } | null;
  sessionTitle: string;
  hasMaterials: boolean;
}

export function ChatWindow({
  sessionId,
  initialMode,
  initialMessages,
  user,
  course,
  sessionTitle,
  hasMaterials,
}: ChatWindowProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<TutorMode>(initialMode);
  const [input, setInput] = useState("");
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, streaming, send, stop } = useChatSession(sessionId, initialMessages);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (isNearBottom || streaming) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, streaming]);

  const onSubmit = useCallback(async () => {
    const v = input.trim();
    if (!v) return;
    setInput("");
    await send(v);
    router.refresh();
  }, [input, send, router]);

  const changeMode = async (next: TutorMode) => {
    if (next === mode) return;
    setMode(next);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      if (!res.ok) throw new Error("Could not switch mode");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Mode change failed",
        description: err instanceof Error ? err.message : "Try again.",
      });
    }
  };

  const removeSession = async () => {
    if (!confirm("Delete this chat? Messages will be permanently removed.")) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/chat");
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not delete",
        description: err instanceof Error ? err.message : "Try again.",
      });
    }
  };

  const exportChat = () => {
    const lines = [
      `# ${sessionTitle}`,
      `Mode: ${MODE_META[mode].label}`,
      course ? `Course: ${course.code} · ${course.title}` : "",
      `Exported: ${new Date().toLocaleString()}`,
      "",
      "---",
      "",
      ...messages
        .filter((m) => !m.streaming)
        .map(
          (m) =>
            `**${m.role === "USER" ? "You" : "Splash AI"}**\n\n${m.content}\n\n---\n`
        ),
    ]
      .filter((l) => l !== null)
      .join("\n");

    const blob = new Blob([lines], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isEmpty = messages.length === 0;
  const modeMeta = MODE_META[mode];
  const isAssistant = isAssistantMode(mode);

  const starters = STARTER_PROMPTS[mode] ?? STARTER_PROMPTS.GENERAL;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur-sm lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back">
            <Link href="/chat">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{sessionTitle}</p>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              {course && isTutorMode(mode) ? (
                <>
                  <BookOpen className="h-3 w-3" />
                  {course.code} · {course.title}
                </>
              ) : (
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {modeMeta.tagline}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={exportChat}
              aria-label="Export chat"
              title="Download as Markdown"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <div className="hidden sm:block">
            <ModeSwitcher value={mode} onChange={changeMode} disabled={streaming} />
          </div>
          <Button variant="ghost" size="icon" onClick={removeSession} aria-label="Delete chat">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Mobile mode switcher */}
      <div className="flex sm:hidden items-center justify-center border-b bg-background px-4 py-2">
        <ModeSwitcher value={mode} onChange={changeMode} disabled={streaming} />
      </div>

      {/* ── Messages ────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="mx-auto w-full max-w-3xl py-6">
          {isEmpty && (
            <EmptyState
              mode={mode}
              modeMeta={modeMeta}
              isAssistant={isAssistant}
              course={course}
              hasMaterials={hasMaterials}
              starters={starters}
              onStarterClick={setInput}
            />
          )}

          {messages.map((m) => (
            <Message
              key={m.id}
              role={m.role}
              content={m.content}
              citations={m.citations}
              streaming={m.streaming}
              userName={user.name}
              userEmail={user.email}
              onCitationClick={(c) => setActiveCitation(c)}
            />
          ))}
        </div>
      </div>

      {/* ── Composer ────────────────────────────────────────────────── */}
      <div className="border-t bg-background/80 px-4 py-3 backdrop-blur-sm">
        <Composer
          value={input}
          onChange={setInput}
          onSubmit={onSubmit}
          onStop={stop}
          streaming={streaming}
          placeholder={modeMeta.tagline + "…"}
          mode={mode}
        />
      </div>

      <SourceDrawer
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  mode,
  modeMeta,
  isAssistant,
  course,
  hasMaterials,
  starters,
  onStarterClick,
}: {
  mode: TutorMode;
  modeMeta: typeof MODE_META[TutorMode];
  isAssistant: boolean;
  course?: { id: string; title: string; code: string } | null;
  hasMaterials: boolean;
  starters: string[];
  onStarterClick: (s: string) => void;
}) {
  const Icon = modeMeta.icon;
  return (
    <div className="mx-4 rounded-2xl border bg-card/60 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-brand text-white shadow-lg shadow-primary/20">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-5 font-serif text-2xl">
        {isAssistant ? (
          <>
            Splash AI — <span className="text-gradient">{modeMeta.label}</span> mode
          </>
        ) : (
          <>
            Tutor in <span className="text-gradient">{modeMeta.label}</span> mode
          </>
        )}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {modeMeta.description}
        {!isAssistant && course && !hasMaterials && (
          <span className="ml-1">
            <Link href={`/courses/${course.id}`} className="underline underline-offset-2 hover:text-primary">
              Upload materials
            </Link>{" "}
            so the tutor can cite your actual syllabus.
          </span>
        )}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {starters.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onStarterClick(p)}
            className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Starter prompts per mode ──────────────────────────────────────────────────

const STARTER_PROMPTS: Record<TutorMode, string[]> = {
  LEARN: [
    "Teach me the first lecture step by step",
    "What are the key concepts I should know?",
    "Walk me through an example problem",
    "Explain this concept like I'm new to it",
  ],
  PRACTICE: [
    "Give me a practice question on week 2",
    "Drill me on definitions",
    "Ask me something hard",
    "Quiz me on the weakest topic",
  ],
  REVISION: [
    "Quick recap of the whole course",
    "Summarise today's lecture",
    "Give me 5 flashcards on weak topics",
    "What are the most important formulas?",
  ],
  DIRECT: [
    "Explain chapter 3 in a paragraph",
    "What's the difference between X and Y?",
    "Define this concept clearly",
    "Give me the formula for…",
  ],
  GENERAL: [
    "Explain a concept I'm struggling with",
    "Summarise these notes for me",
    "What's the best way to study for exams?",
    "Brainstorm ideas for my project",
    "Help me understand this topic",
    "Make a study plan for me",
  ],
  CODE: [
    "Debug this error for me",
    "Write a function that does…",
    "Explain how this code works",
    "Review my code for issues",
    "How do I implement…?",
    "Convert this to Python",
  ],
  WRITE: [
    "Write an essay introduction on…",
    "Help me structure my assignment",
    "Improve this paragraph",
    "Write a professional email to…",
    "Make this more concise",
    "Help me with my dissertation",
  ],
  RESEARCH: [
    "Analyse the causes of…",
    "Compare and contrast X and Y",
    "Break down this argument critically",
    "What are the main theories of…?",
    "Evaluate the evidence for…",
    "Give me a literature overview on…",
  ],
  BUSINESS: [
    "Help me write a business plan",
    "SWOT analysis for my idea",
    "How do I improve productivity?",
    "Give me a pricing strategy",
    "Help me prepare for a presentation",
    "What's a good framework for…?",
  ],
};
