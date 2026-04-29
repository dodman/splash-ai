/**
 * POST /api/academy/summarize-material
 * Splash AI endpoint — generates a structured summary of course material.
 * Protected by ACADEMY_API_KEY — no user session required.
 *
 * Body:
 *   courseId      string?   – for logging
 *   courseName    string?   – displayed to the model for context
 *   materialTitle string?   – title of the material being summarised
 *   text          string    – raw extracted text to summarise (max 60 000 chars)
 *   summaryType   "short" | "detailed" | "revision-notes"
 *                           short          → 150–250 word executive overview
 *                           detailed       → thorough section-by-section breakdown
 *                           revision-notes → bullet-point exam-ready notes
 *
 * Response:
 *   {
 *     summary:               string,    – main summary text
 *     keyPoints:             string[],  – 5–10 key takeaways
 *     possibleExamQuestions: string[],  – 3–7 likely exam/assessment questions
 *   }
 */

import { NextResponse } from "next/server";
import { getAIProvider } from "@/providers/ai";
import { z } from "zod";
import { GENERAL_ASSISTANT_IDENTITY } from "@/prompts/base";
import { validateAcademyKey } from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_INPUT_CHARS = 60_000;

const bodySchema = z.object({
  courseId: z.string().optional(),
  courseName: z.string().optional(),
  materialTitle: z.string().optional(),
  text: z.string().trim().min(20, "text is too short to summarise").max(MAX_INPUT_CHARS),
  summaryType: z.enum(["short", "detailed", "revision-notes"]).default("short"),
});

const responseSchema = z.object({
  summary: z.string().min(20),
  keyPoints: z.array(z.string()).min(1).max(15),
  possibleExamQuestions: z.array(z.string()).min(1).max(10),
});

function buildPrompt(
  text: string,
  summaryType: string,
  courseName?: string,
  materialTitle?: string
): string {
  const context = [
    courseName ? `Course: ${courseName}` : "",
    materialTitle ? `Material: ${materialTitle}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const styleInstructions: Record<string, string> = {
    short:
      "Write a concise overview (150–250 words) covering the main ideas. " +
      "It should give a student a clear picture of what the material is about without reading it.",
    detailed:
      "Write a thorough, section-by-section breakdown. Explain all major concepts, definitions, " +
      "and arguments in depth. A student should be able to understand the full scope of the material from your summary.",
    "revision-notes":
      "Write exam-ready bullet-point revision notes. Organise by topic. " +
      "Include definitions, key facts, formulas, and anything likely to appear in an exam. " +
      "Use numbered sub-points where helpful. Be dense and precise.",
  };

  return `${context ? context + "\n" : ""}SUMMARY STYLE: ${summaryType}
${styleInstructions[summaryType]}

MATERIAL TO SUMMARISE:
${text}

Rules for your JSON output:
"summary": the main summary in the requested style (do NOT use hyphen bullets; use numbered lists or short paragraphs)
"keyPoints": 5–10 important takeaways a student must remember; each a single, complete sentence
"possibleExamQuestions": 3–7 realistic exam or assignment questions that could be set on this material`;
}

export async function POST(req: Request) {
  if (!validateAcademyKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.errors[0]?.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { text, summaryType, courseName, materialTitle } = body;
  const prompt = buildPrompt(text, summaryType, courseName, materialTitle);

  try {
    const ai = getAIProvider();
    // Detailed summaries of long texts benefit from the smart model;
    // short summaries and large inputs (many tokens) also escalate.
    const selectedModel = ai.selectModel(
      summaryType === "detailed" ? "RESEARCH" : "GENERAL",
      text.length
    );

    const system = [
      GENERAL_ASSISTANT_IDENTITY,
      "",
      "You specialise in producing high-quality academic summaries for university students.",
      "Return ONLY the JSON object requested — no markdown fences, no extra commentary.",
    ].join("\n");

    const result = await ai.chatJSON({
      system,
      messages: [{ role: "user", content: prompt }],
      schema: responseSchema,
      temperature: 0.3,
      model: selectedModel,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Summarisation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
