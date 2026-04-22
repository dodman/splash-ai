import { z } from "zod";

export const quizQuestionSchema = z.object({
  type: z.enum(["MCQ", "SHORT", "SCENARIO"]),
  prompt: z.string().min(8),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(10),
  topic: z.string().min(1),
});

export const quizGenerationSchema = z.object({
  title: z.string().min(3).max(120),
  questions: z.array(quizQuestionSchema).min(1).max(20),
});

export type GeneratedQuiz = z.infer<typeof quizGenerationSchema>;

export function buildQuizGenerationPrompt(params: {
  courseTitle?: string;
  topic?: string;
  count: number;
  types: Array<"MCQ" | "SHORT" | "SCENARIO">;
  sources: string;
  studentLevel: string;
}): string {
  const typesStr = params.types.join(", ");
  return `
Generate a ${params.count}-question quiz for the student based on the SOURCES below.

${params.courseTitle ? `Course: ${params.courseTitle}\n` : ""}${
    params.topic ? `Focus topic: ${params.topic}\n` : ""
  }Student level: ${params.studentLevel}
Allowed question types: ${typesStr}

RULES:
- Ground every question in the SOURCES. Do not invent facts or ask about material
  not present in the sources.
- MCQ questions MUST include exactly 4 options. The correctAnswer must be the full
  text of one of the options (exact match).
- SHORT questions expect a 1–2 sentence answer. correctAnswer holds an ideal answer.
- SCENARIO questions describe a realistic situation and ask for analysis.
  correctAnswer holds an ideal short analysis (2–4 sentences).
- explanation must teach WHY the correct answer is correct — not just restate it.
- topic must be a 2–5 word label of the concept tested (e.g. "Porter's five forces",
  "marginal cost curve").

SOURCES:
${params.sources}
`.trim();
}

export function buildShortAnswerGradingPrompt(params: {
  prompt: string;
  expected: string;
  studentAnswer: string;
}): string {
  return `
You are grading a short-answer question for a student. Be strict on accuracy but
generous on wording — paraphrases are fine.

QUESTION:
${params.prompt}

IDEAL ANSWER:
${params.expected}

STUDENT ANSWER:
${params.studentAnswer}

Return JSON with:
- correct: boolean (true if substantively correct, false if missing key points)
- points: number between 0 and 1 (partial credit)
- feedback: one-sentence explanation of what is right/wrong, addressed to the student.
`.trim();
}

export const shortAnswerGradingSchema = z.object({
  correct: z.boolean(),
  points: z.number().min(0).max(1),
  feedback: z.string().min(4),
});

export type ShortAnswerGrade = z.infer<typeof shortAnswerGradingSchema>;
