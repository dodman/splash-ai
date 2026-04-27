"use client";

import { useEffect, useRef } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TutorMode } from "@/lib/modes";

interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  streaming: boolean;
  placeholder?: string;
  mode?: TutorMode;
}

const MODE_HINTS: Partial<Record<TutorMode, string>> = {
  CODE: "Paste code, describe a bug, or ask anything technical",
  WRITE: "Describe what you want written, or paste text to improve",
  RESEARCH: "Ask a deep question, paste an argument to critique, or request analysis",
  BUSINESS: "Describe your business question or ask for strategic advice",
};

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  streaming,
  placeholder,
  mode,
}: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 300)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!streaming && value.trim()) onSubmit();
    }
  };

  const canSubmit = !streaming && value.trim().length > 0;
  const hint = mode ? MODE_HINTS[mode] : undefined;
  const charCount = value.length;
  const nearLimit = charCount > 10000;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      className="relative mx-auto w-full max-w-3xl"
    >
      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border bg-card px-3 py-2 shadow-lg shadow-primary/5 transition-all",
          "focus-within:border-primary/40 focus-within:shadow-primary/10"
        )}
      >
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || hint || "Ask anything…"}
          rows={1}
          className="flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground scrollbar-thin"
          style={{ maxHeight: 300 }}
        />
        {streaming && onStop ? (
          <Button type="button" size="icon" variant="outline" onClick={onStop} aria-label="Stop">
            <Square className="h-4 w-4 fill-current" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            variant="gradient"
            disabled={!canSubmit}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between px-2">
        <p className="text-[11px] text-muted-foreground">
          ⏎ to send · ⇧⏎ for newline
        </p>
        {nearLimit && (
          <p className={cn("text-[11px]", charCount > 11500 ? "text-destructive" : "text-muted-foreground")}>
            {charCount.toLocaleString()} / 12,000
          </p>
        )}
      </div>
    </form>
  );
}
