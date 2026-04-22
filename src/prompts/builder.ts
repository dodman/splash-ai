import type { TutorMode, StudentLevel, ResponseLength } from "@prisma/client";
import type { RetrievedChunk } from "@/types";
import { BASE_TUTOR_IDENTITY, CITATION_RULES } from "./base";
import { MODE_INSTRUCTIONS } from "./modes";
import { formatSourcesForPrompt } from "@/services/retrievalService";

interface TutorPromptContext {
  mode: TutorMode;
  level: StudentLevel;
  preferredLength: ResponseLength;
  course?: { title: string; code: string; degree: string } | null;
  weakTopics?: string[];
  retrievedChunks: RetrievedChunk[];
}

const LENGTH_GUIDANCE: Record<ResponseLength, string> = {
  CONCISE: "Keep replies short — aim for 2–4 sentences or a single tight list. No preamble.",
  NORMAL: "Aim for a focused reply of 3–6 short paragraphs or an equivalent list.",
  DETAILED: "Go deep when useful. Up to ~500 words. Include worked examples where they aid understanding.",
};

const LEVEL_GUIDANCE: Record<StudentLevel, string> = {
  BEGINNER: "Student is a BEGINNER. Use plain language. Define jargon the first time you use it. Go slow.",
  INTERMEDIATE: "Student is at INTERMEDIATE level. Assume foundations. Explain intermediate concepts fully; reference basics only if needed.",
  ADVANCED: "Student is ADVANCED. You can use technical vocabulary without defining. Focus on subtle distinctions and edge cases.",
};

export function composeTutorPrompt(ctx: TutorPromptContext): {
  system: string;
  contextMessage: string;
} {
  const courseLine = ctx.course
    ? `COURSE: ${ctx.course.title} (${ctx.course.code}) — ${ctx.course.degree}.`
    : `COURSE: (none selected — student is asking a general question)`;

  const weakLine =
    ctx.weakTopics && ctx.weakTopics.length > 0
      ? `WEAK TOPICS the student has struggled with recently: ${ctx.weakTopics.join(", ")}.\nWhen natural, tie in to these topics for reinforcement.`
      : "";

  const system = [
    BASE_TUTOR_IDENTITY,
    "",
    CITATION_RULES,
    "",
    MODE_INSTRUCTIONS[ctx.mode],
    "",
    LEVEL_GUIDANCE[ctx.level],
    "",
    LENGTH_GUIDANCE[ctx.preferredLength],
  ]
    .filter(Boolean)
    .join("\n\n");

  const contextMessage = [
    courseLine,
    weakLine,
    "",
    "SOURCES from the student's uploaded materials (use these first):",
    formatSourcesForPrompt(ctx.retrievedChunks),
  ]
    .filter((s) => s !== "")
    .join("\n");

  return { system, contextMessage };
}
