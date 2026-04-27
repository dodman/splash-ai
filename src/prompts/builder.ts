// ============================================================================
// Tutor prompt builder — used when mode ∈ {LEARN, PRACTICE, REVISION, DIRECT}
// ============================================================================
import type { TutorMode, StudentLevel, ResponseLength } from "@prisma/client";
import type { RetrievedChunk } from "@/types";
import { BASE_TUTOR_IDENTITY, CITATION_RULES } from "./base";
import { TUTOR_MODE_INSTRUCTIONS } from "./modes";
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
  CONCISE:
    "Keep replies short — aim for 2–4 sentences or a tight list. No preamble. No padding.",
  NORMAL:
    "Aim for a focused reply of 3–6 short paragraphs or equivalent. Trim anything that doesn't add value.",
  DETAILED:
    "Go deep when useful — up to ~600 words. Include worked examples, edge cases, and derivations where they add understanding.",
};

const LEVEL_GUIDANCE: Record<StudentLevel, string> = {
  BEGINNER:
    "STUDENT LEVEL: Beginner. Use plain language. Define all jargon on first use. Build from first principles. Go slow.",
  INTERMEDIATE:
    "STUDENT LEVEL: Intermediate. Assume foundational knowledge. Explain intermediate concepts fully. Reference basics only when the student seems confused.",
  ADVANCED:
    "STUDENT LEVEL: Advanced. Use technical vocabulary freely. Focus on subtleties, edge cases, and nuances. Assume competence.",
};

export function composeTutorPrompt(ctx: TutorPromptContext): {
  system: string;
  contextMessage: string;
} {
  const modeInstruction = TUTOR_MODE_INSTRUCTIONS[ctx.mode] ?? "";

  const courseLine = ctx.course
    ? `COURSE: ${ctx.course.title} (${ctx.course.code}) — ${ctx.course.degree}.`
    : "COURSE: (none selected — student is asking a general question)";

  const weakLine =
    ctx.weakTopics && ctx.weakTopics.length > 0
      ? `WEAK TOPICS the student has struggled with recently: ${ctx.weakTopics.join(", ")}.\nWhen natural, tie these in for reinforcement.`
      : "";

  const system = [
    BASE_TUTOR_IDENTITY,
    "",
    CITATION_RULES,
    "",
    modeInstruction,
    "",
    LEVEL_GUIDANCE[ctx.level],
    "",
    LENGTH_GUIDANCE[ctx.preferredLength],
  ]
    .filter(Boolean)
    .join("\n\n");

  const sourcesText = formatSourcesForPrompt(ctx.retrievedChunks);

  const contextMessage = [
    courseLine,
    weakLine,
    "",
    "SOURCES from the student's uploaded materials (prioritise these):",
    sourcesText || "(no materials uploaded yet — answer from general knowledge and note this)",
  ]
    .filter((s) => s !== "")
    .join("\n");

  return { system, contextMessage };
}
