/**
 * POST /api/academy/generate-quiz
 * Academy-to-Splash-AI service endpoint.
 * Protected by ACADEMY_API_KEY — no user session required.
 *
 * Body:
 *   courseId         string?
 *   courseName       string?
 *   topic            string?            – focus topic (optional)
 *   materials        AcademyMaterial[]  – plain strings (legacy) or rich objects
 *   numberOfQuestions number            – 3–20
 *   difficulty       "easy" | "medium" | "hard"
 *   questionType     "multiple-choice" | "true-false" | "short-answer"
 *
 * Response:
 *   { quiz: [ { question, options?, correctAnswer, explanation } ] }
 */

import { NextResponse } from "next/server";
import { getAIProvider } from "@/providers/ai";
import { z } from "zod";
import {
  validateAcademyKey,
  normalizeMaterials,
  buildMaterialContext,
  type AcademyMaterial,
} from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 90;

const materialSchema = z.union([
  z.string(),
  z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    filename: z.string().optional(),
    text: z.string(),
  }),
]);

const bodySchema = z.object({
  courseId: z.string().optional(),
  courseName: z.string().optional(),
  topic: z.string().trim().max(200).optional(),
  materials: z.array(materialSchema).default([]),
  numberOfQuestions: z.coerce.number().int().min(3).max(20).default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  questionType: z
    .enum(["multiple-choice", "true-false", "short-answer"])
    .default("multiple-choice"),
});

const quizSchema = z.object({
  quiz: z
    .array(
      z.object({
        question: z.string().min(8),
        options: z.array(z.string()).optional(),
        correctAnswer: z.string().min(1),
        explanation: z.string().min(10),
      })
    )
    .min(1),
});

function difficultyLabel(d: string): string {
  return { easy: "Beginner", medium: "Intermediate", hard: "Advanced" }[d] ?? "Intermediate";
}

function buildPrompt(params: {
  courseName?: string;
  topic?: string;
  count: number;
  questionType: string;
  difficulty: string;
  materialText: string;
}): string {
  const { courseName, topic, count, questionType, difficulty, materialText } = params;
  const sourceAvailable = materialText.length > 0;

  let typeInstructions = "";
  if (questionType === "multiple-choice") {
    typeInstructions =
      'All questions must be multiple-choice with EXACTLY 4 options (A, B, C, D). ' +
      'The "correctAnswer" field must be the full text of the correct option (not a letter — the whole option text).';
  } else if (questionType === "true-false") {
    typeInstructions =
      'All questions must be True/False. The "options" field must be exactly ["True", "False"]. ' +
      'The "correctAnswer" must be "True" or "False".';
  } else {
    typeInstructions =
      'All questions are short-answer. Omit the "options" field. ' +
      'The "correctAnswer" should be a concise ideal answer (1–3 sentences).';
  }

  return `Generate ${count} ${difficulty}-level quiz questions for a university student.
${courseName ? `Course: ${courseName}` : ""}
${topic ? `Focus topic: ${topic}` : ""}
Student level: ${difficultyLabel(difficulty)}

QUESTION TYPE RULES:
${typeInstructions}

CONTENT RULES:
${
  sourceAvailable
    ? "Ground ALL questions in the COURSE MATERIALS below. Do not invent facts outside the materials."
    : "Generate questions based on general academic knowledge about the course/topic."
}
The "explanation" must explain WHY the answer is correct (teach the concept, not just restate it).
Do not repeat questions. Make each question test a distinct concept or skill.
Questions should range from recall to application where possible.

${sourceAvailable ? `COURSE MATERIALS:\n${materialText}` : ""}`;
}

export async function POST(req: Request) {
  if (!validateAcademyKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { courseName, topic, numberOfQuestions, difficulty, questionType } = body;
  const normalized = normalizeMaterials(body.materials as AcademyMaterial[]);
  const materialText = buildMaterialContext(normalized);

  const prompt = buildPrompt({
    courseName,
    topic,
    count: numberOfQuestions,
    questionType,
    difficulty,
    materialText,
  });

  try {
    const ai = getAIProvider();
    // Quiz generation needs accuracy and creativity — always use the smart model
    const selectedModel = ai.selectModel("CODE", 0);

    const result = await ai.chatJSON({
      system:
        "You are an expert academic assessment designer for university-level courses. " +
        "You create rigorous, well-written quiz questions that test genuine understanding — not just memorisation. " +
        "Return ONLY the JSON object requested — no markdown fences, no extra text.",
      messages: [{ role: "user", content: prompt }],
      schema: quizSchema,
      temperature: 0.6,
      model: selectedModel,
    });

    // Extra validation for MCQ/TF: correctAnswer must be in options
    const validated = result.quiz.filter((q) => {
      if (questionType === "short-answer") return true;
      if (!q.options || q.options.length < 2) return false;
      return q.options.includes(q.correctAnswer);
    });

    if (validated.length === 0) {
      return NextResponse.json(
        { error: "The AI returned an unusable quiz. Please try again." },
        { status: 422 }
      );
    }

    return NextResponse.json({ quiz: validated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Quiz generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
