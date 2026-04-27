"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MODE_META, TUTOR_MODES, ASSISTANT_MODES, type TutorMode } from "@/lib/modes";
import { cn } from "@/lib/utils";

interface ModeSwitcherProps {
  value: TutorMode;
  onChange: (mode: TutorMode) => void;
  disabled?: boolean;
}

export function ModeSwitcher({ value, onChange, disabled }: ModeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const currentMeta = MODE_META[value];
  const CurrentIcon = currentMeta.icon;

  return (
    <div className="relative">
      {/* Current mode button */}
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-sm transition-all disabled:opacity-50",
          "hover:border-primary/40 hover:bg-accent",
          open && "border-primary/40 bg-accent"
        )}
      >
        <CurrentIcon className={cn("h-3.5 w-3.5", currentMeta.accent)} />
        <span>{currentMeta.label}</span>
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-2xl border border-border/80 bg-card/95 p-2 shadow-xl backdrop-blur-sm">
            {/* Tutor modes */}
            <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tutor modes
            </p>
            <div className="grid grid-cols-2 gap-1">
              {TUTOR_MODES.map((m) => (
                <ModeOption
                  key={m}
                  mode={m}
                  active={m === value}
                  onSelect={() => { onChange(m); setOpen(false); }}
                />
              ))}
            </div>

            <div className="my-2 border-t border-border/60" />

            {/* Assistant modes */}
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              AI assistant
            </p>
            <div className="grid grid-cols-2 gap-1">
              {ASSISTANT_MODES.map((m) => (
                <ModeOption
                  key={m}
                  mode={m}
                  active={m === value}
                  onSelect={() => { onChange(m); setOpen(false); }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ModeOption({
  mode,
  active,
  onSelect,
}: {
  mode: TutorMode;
  active: boolean;
  onSelect: () => void;
}) {
  const meta = MODE_META[mode];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-start gap-2 rounded-xl px-2.5 py-2 text-left transition-all",
        active
          ? "bg-primary/10 text-foreground"
          : "hover:bg-accent text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", active ? meta.accent : "")} />
      <div>
        <p className="text-xs font-medium leading-none">{meta.label}</p>
        <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground/80">
          {meta.tagline}
        </p>
      </div>
    </button>
  );
}
