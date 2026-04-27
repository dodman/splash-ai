/**
 * POST /api/academy/generate-quiz
 * Academy-to-Splash-AI service endpoint.
 * Protected by ACADEMY_API_KEY — no user session required.
 *
 * Body:
 *   courseId         string
 *   courseName       string
 *   topic            string   – focus topic (optional)
 *   materials        string[] – extracted text from uploaded materials
 *   numberOfQuestions number  – 3–20
 *   difficulty       string   – "easy" | "medium" | "hard"
 *   questionType     string   – "multiple-choice" | "true-false" | "short-answer"
 *
 * Response:
 *   { quiz: [ { question, options?, correctAnswer, explanation } ] }
 */

import { NextResponse } from "next/server";
import { getAIProvider } from "@/providers/ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 90;

const bodySchema = z.object({
  courseId: z.string().optional(),
  courseName: z.string().optional(),
  topic: z.string().trim().max(200).optional(),
  materials: z.array(z.string()).default([]),
  numberOfQuestions: z.coerce.number().int().min(3).max(20).default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  questionType: z
    .enum(["multiple-choice", "true-false", "short-answer"])
    .default("multiple-choice"),
});

const quizSchema = z.object({
  quiz: z.array(
    z.object({
      question: z.string().min(8),
      options: z.array(z.string()).optional(),
      correctAnswer: z.string().min(1),
      explanation: z.string().min(10),
    })
  ).min(1),
});

function validateApiKey(req: Request): boolean {
  const key = req.headers.get("x-academy-key");
  const secret = process.env.ACADEMY_API_KEY;
  if (!secret) return false;
  return key === secret;
}

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
      'The "correctAnswer" field must be the full text of the correct option.';
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
    ? `Ground ALL questions in the COURSE MATERIALS below. Do not invent facts outside the materials.`
    : `Generate questions based on general academic knowledge about the course/topic.`
}
- The "explanation" must explain WHY the answer is correct (teach the concept).
- Do not repeat questions.

${sourceAvailable ? `COURSE MATERIALS:\n${materialText}` : ""}

Return ONLY valid JSON in this exact shape:
{
  "quiz": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": "...",
      "explanation": "..."
    }
  ]
}`;
}

export async function POST(req: Request) {
  if (!validateApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { courseName, topic, materials, numberOfQuestions, difficulty, questionType } = body;

  const materialText = materials
    .filter(Boolean)
    .join("\n\n---\n\n")
    .slice(0, 20_000);

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
    const result = await ai.chatJSON({
      system:
        "You generate university-level quiz questions. Return ONLY the JSON object requested — no markdown fences, no extra text.",
      messages: [{ role: "user", content: prompt }],
      schema: quizSchema,
      temperature: 0.6,
    });

    // Extra validation for MCQ: correctAnswer must be in options
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
