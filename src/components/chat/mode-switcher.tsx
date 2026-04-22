"use client";

import { MODE_META, type TutorMode } from "@/lib/modes";
import { cn } from "@/lib/utils";

interface ModeSwitcherProps {
  value: TutorMode;
  onChange: (mode: TutorMode) => void;
  disabled?: boolean;
}

export function ModeSwitcher({ value, onChange, disabled }: ModeSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Tutor mode"
      className="inline-flex items-center gap-1 rounded-full border bg-card p-1 text-xs shadow-sm"
    >
      {(Object.keys(MODE_META) as TutorMode[]).map((m) => {
        const meta = MODE_META[m];
        const Icon = meta.icon;
        const active = m === value;
        return (
          <button
            key={m}
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(m)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-all disabled:opacity-50",
              active
                ? "bg-gradient-brand text-white shadow-sm shadow-primary/20"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
