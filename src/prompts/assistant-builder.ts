// ============================================================================
// Assistant prompt builder — used when mode ∈ {GENERAL, CODE, WRITE, RESEARCH, BUSINESS}
// ============================================================================
import type { TutorMode, StudentLevel, ResponseLength } from "@prisma/client";
import {
  GENERAL_ASSISTANT_IDENTITY,
  CODE_ASSISTANT_IDENTITY,
  WRITE_ASSISTANT_IDENTITY,
  RESEARCH_ASSISTANT_IDENTITY,
  BUSINESS_ASSISTANT_IDENTITY,
} from "./base";

const IDENTITY_MAP: Partial<Record<TutorMode, string>> = {
  GENERAL: GENERAL_ASSISTANT_IDENTITY,
  CODE: CODE_ASSISTANT_IDENTITY,
  WRITE: WRITE_ASSISTANT_IDENTITY,
  RESEARCH: RESEARCH_ASSISTANT_IDENTITY,
  BUSINESS: BUSINESS_ASSISTANT_IDENTITY,
};

const LEVEL_SUFFIX: Record<StudentLevel, string> = {
  BEGINNER:
    "The user is a beginner. Use plain language, avoid unexplained jargon, and build from first principles.",
  INTERMEDIATE:
    "The user has intermediate knowledge. Assume foundational understanding and go into appropriate depth.",
  ADVANCED:
    "The user is advanced. Use technical vocabulary freely and engage with nuance and depth.",
};

const LENGTH_SUFFIX: Record<ResponseLength, string> = {
  CONCISE:
    "Response length: be concise. Lead with the answer, cut everything that doesn't add value.",
  NORMAL:
    "Response length: balanced. Cover what's needed without padding — stop when the point is made.",
  DETAILED:
    "Response length: thorough. Go deep, include examples, explore edge cases. Prefer depth over brevity.",
};

export interface AssistantPromptContext {
  mode: TutorMode;
  level: StudentLevel;
  preferredLength: ResponseLength;
  /** Optional: if the user is in the context of a course */
  courseName?: string | null;
}

const NO_HYPHEN_RULE =
  'Do NOT use hyphen bullets (lines starting with "- "). Use numbered lists (1. 2. 3.) or short prose paragraphs instead. Never use em-dashes (—) as sentence separators.';

export function composeAssistantPrompt(ctx: AssistantPromptContext): string {
  const identity = IDENTITY_MAP[ctx.mode] ?? GENERAL_ASSISTANT_IDENTITY;
  const levelNote = LEVEL_SUFFIX[ctx.level];
  const lengthNote = LENGTH_SUFFIX[ctx.preferredLength];

  const courseNote = ctx.courseName
    ? `Context: the user is studying "${ctx.courseName}". Tailor responses to this academic context when relevant.`
    : "";

  return [identity, "", levelNote, lengthNote, NO_HYPHEN_RULE, courseNote]
    .filter(Boolean)
    .join("\n");
}

/** Build a 3-6 word session title for assistant chats */
export function assistantModeTitle(mode: TutorMode): Record<string, string[]> {
  const starters: Partial<Record<TutorMode, string[]>> = {
    GENERAL: [
      "Explain quantum computing simply",
      "What is opportunity cost?",
      "Summarize the key ideas of stoicism",
      "Help me understand machine learning",
      "What are the best study techniques?",
      "Brainstorm 10 ideas for my project",
    ],
    CODE: [
      "Debug this Python error",
      "Write a REST API in Node.js",
      "Explain async/await in JavaScript",
      "Review my code for bugs",
      "How does a hash map work?",
      "Convert this SQL to Pandas",
    ],
    WRITE: [
      "Write an essay introduction on climate change",
      "Improve my assignment draft",
      "Write a professional email to my professor",
      "Help me structure my dissertation",
      "Rewrite this paragraph more clearly",
      "Give me a study plan outline",
    ],
    RESEARCH: [
      "Analyse the causes of World War I",
      "Compare Keynesian vs Austrian economics",
      "Critically evaluate this argument",
      "What are the main theories of motivation?",
      "Break down the scientific method",
      "Explore pros and cons of universal basic income",
    ],
    BUSINESS: [
      "Help me write a business plan",
      "SWOT analysis for a startup idea",
      "How do I improve team productivity?",
      "Explain Porter's Five Forces",
      "Give me a pricing strategy framework",
      "What makes a good pitch deck?",
    ],
  };
  return starters as Record<string, string[]>;
}
