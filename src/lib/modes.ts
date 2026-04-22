import { BookOpenCheck, Dumbbell, Lightbulb, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TutorMode = "LEARN" | "PRACTICE" | "REVISION" | "DIRECT";

export interface ModeMeta {
  label: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

export const MODE_META: Record<TutorMode, ModeMeta> = {
  LEARN: {
    label: "Learn",
    tagline: "Scaffolded teaching",
    description: "Introduces one concept at a time, then checks you understood.",
    icon: Lightbulb,
    accent: "text-indigo-500",
  },
  PRACTICE: {
    label: "Practice",
    tagline: "Drill with hints",
    description: "Asks you questions, grades replies, ladders hints if you're stuck.",
    icon: Dumbbell,
    accent: "text-violet-500",
  },
  REVISION: {
    label: "Revision",
    tagline: "Rapid recap",
    description: "Fast summaries + flashcard prompts targeting weak topics.",
    icon: BookOpenCheck,
    accent: "text-fuchsia-500",
  },
  DIRECT: {
    label: "Direct",
    tagline: "Just the answer",
    description: "Clear answer first, still grounded and cited. No fluff.",
    icon: Zap,
    accent: "text-emerald-500",
  },
};
