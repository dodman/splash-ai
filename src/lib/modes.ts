import {
  BookOpenCheck,
  Dumbbell,
  Lightbulb,
  Zap,
  Bot,
  Code2,
  PenLine,
  FlaskConical,
  Briefcase,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TutorMode =
  | "LEARN"
  | "PRACTICE"
  | "REVISION"
  | "DIRECT"
  | "GENERAL"
  | "CODE"
  | "WRITE"
  | "RESEARCH"
  | "BUSINESS";

export const TUTOR_MODES: TutorMode[] = ["LEARN", "PRACTICE", "REVISION", "DIRECT"];
export const ASSISTANT_MODES: TutorMode[] = ["GENERAL", "CODE", "WRITE", "RESEARCH", "BUSINESS"];

export interface ModeMeta {
  label: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  group: "tutor" | "assistant";
  /** Model tier hint: "smart" = gpt-4o, "fast" = gpt-4o-mini */
  modelTier: "smart" | "fast";
}

export const MODE_META: Record<TutorMode, ModeMeta> = {
  // ── Tutor modes (RAG-grounded, pedagogy-first) ─────────────────────────────
  LEARN: {
    label: "Learn",
    tagline: "Scaffolded teaching",
    description: "Introduces one concept at a time, then checks you understood before moving on.",
    icon: Lightbulb,
    accent: "text-indigo-500",
    group: "tutor",
    modelTier: "fast",
  },
  PRACTICE: {
    label: "Practice",
    tagline: "Drill with hints",
    description: "Asks you questions, grades replies, and ladders hints when you're stuck.",
    icon: Dumbbell,
    accent: "text-violet-500",
    group: "tutor",
    modelTier: "fast",
  },
  REVISION: {
    label: "Revision",
    tagline: "Rapid recap",
    description: "Fast summaries and flashcard prompts targeting your weakest topics.",
    icon: BookOpenCheck,
    accent: "text-fuchsia-500",
    group: "tutor",
    modelTier: "fast",
  },
  DIRECT: {
    label: "Direct",
    tagline: "Just the answer",
    description: "Clear answer first, grounded in your materials, no fluff.",
    icon: Zap,
    accent: "text-emerald-500",
    group: "tutor",
    modelTier: "fast",
  },
  // ── Assistant modes (general-purpose AI) ────────────────────────────────────
  GENERAL: {
    label: "Assistant",
    tagline: "All-purpose AI",
    description: "A brilliant generalist — ask it anything. Teaching, advice, brainstorming, research.",
    icon: Bot,
    accent: "text-sky-500",
    group: "assistant",
    modelTier: "fast",
  },
  CODE: {
    label: "Code",
    tagline: "Write & debug code",
    description: "Expert programmer across all languages. Write, debug, explain, and review code.",
    icon: Code2,
    accent: "text-green-500",
    group: "assistant",
    modelTier: "smart",
  },
  WRITE: {
    label: "Write",
    tagline: "Essays & content",
    description: "Craft essays, assignments, reports, emails — polished and professionally structured.",
    icon: PenLine,
    accent: "text-amber-500",
    group: "assistant",
    modelTier: "fast",
  },
  RESEARCH: {
    label: "Research",
    tagline: "Deep analysis",
    description: "Multi-angle analysis, literature breakdowns, critical thinking, and evidence-based reasoning.",
    icon: FlaskConical,
    accent: "text-rose-500",
    group: "assistant",
    modelTier: "smart",
  },
  BUSINESS: {
    label: "Business",
    tagline: "Strategy & advice",
    description: "Business plans, strategy, productivity frameworks, decision-making, and professional advice.",
    icon: Briefcase,
    accent: "text-orange-500",
    group: "assistant",
    modelTier: "fast",
  },
};

/** Returns true when the mode uses the RAG pipeline and tutor pedagogy */
export function isTutorMode(mode: TutorMode): boolean {
  return TUTOR_MODES.includes(mode);
}

/** Returns true when the mode is a general assistant (no RAG, no course required) */
export function isAssistantMode(mode: TutorMode): boolean {
  return ASSISTANT_MODES.includes(mode);
}

export const MODE_LABELS: Record<TutorMode, string> = Object.fromEntries(
  Object.entries(MODE_META).map(([k, v]) => [k, v.label])
) as Record<TutorMode, string>;
