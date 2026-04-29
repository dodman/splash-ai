/**
 * POST /api/academy/ask
 * Academy-to-Splash-AI service endpoint.
 * Protected by ACADEMY_API_KEY — no user session required.
 *
 * Body:
 *   courseId      string?            – for logging / future scoping
 *   courseName    string?            – shown to the model
 *   question      string             – student's question
 *   materials     AcademyMaterial[]  – plain strings (legacy) or rich objects
 *   studentLevel  string?            – "university" | "beginner" | etc.
 *
 * Response:
 *   { answer, sourceUsed, citations, message }
 *   citations: [{ materialId?, title?, filename? }]
 */

import { NextResponse } from "next/server";
import { getAIProvider } from "@/providers/ai";
import { z } from "zod";
import {
  BASE_TUTOR_IDENTITY,
  CITATION_RULES,
  GENERAL_ASSISTANT_IDENTITY,
} from "@/prompts/base";
import {
  validateAcademyKey,
  normalizeMaterials,
  buildMaterialContext,
  type AcademyMaterial,
} from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  question: z.string().trim().min(1).max(8000),
  materials: z.array(materialSchema).default([]),
  studentLevel: z.string().default("university"),
});

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

  const { question, courseName, studentLevel } = body;
  const normalized = normalizeMaterials(body.materials as AcademyMaterial[]);
  const materialText = buildMaterialContext(normalized);
  const sourceUsed = materialText.length > 0;

  // Build citation list from materials that actually made it into context.
  const citations: { materialId?: string; title?: string; filename?: string }[] = [];
  if (sourceUsed) {
    let used = 0;
    for (const m of normalized) {
      const label = m.title || m.filename ? `[${m.title || m.filename}]\n` : "";
      const block = `${label}${m.text}`;
      if (used + block.length > 18_000) break;
      if (m.id || m.title || m.filename) {
        citations.push({ materialId: m.id, title: m.title, filename: m.filename });
      }
      used += block.length;
    }
  }

  // ── System prompt — use the full Splash AI tutor identity ──────────────────
  const system = sourceUsed
    ? [
        BASE_TUTOR_IDENTITY,
        "",
        CITATION_RULES,
        "",
        courseName ? `COURSE: ${courseName}` : "",
        `Student level: ${studentLevel}.`,
        "Answer using the SOURCES provided in the conversation context. Ground every claim in the materials and cite inline as [1], [2], etc.",
        "If the exact answer is not in the materials, say: \"This topic isn't fully covered in the uploaded materials, but based on general knowledge:\" then answer from knowledge.",
      ]
        .filter(Boolean)
        .join("\n")
    : [
        GENERAL_ASSISTANT_IDENTITY,
        "",
        courseName
          ? `Context: the student is studying "${courseName}". Tailor responses to this academic context.`
          : "",
        "Answer from general academic knowledge. Be clear and educational. Never fabricate facts.",
      ]
        .filter(Boolean)
        .join("\n");

  // ── Message construction — mirror tutorService priming-exchange pattern ────
  // When materials are available, inject them as a priming user/assistant exchange
  // so the model has strong grounding before the student's question.
  const messages = sourceUsed
    ? [
        {
          role: "user" as const,
          content: [
            courseName ? `COURSE: ${courseName}` : "",
            "",
            "SOURCES from uploaded course materials:",
            materialText,
          ]
            .filter(Boolean)
            .join("\n"),
        },
        {
          role: "assistant" as const,
          content:
            "Understood. I have the course context and sources ready. I'll ground my answer in these materials and cite inline as [1], [2], etc. when I use them.",
        },
        { role: "user" as const, content: question },
      ]
    : [{ role: "user" as const, content: question }];

  try {
    const ai = getAIProvider();
    // Use the smarter model for complex or long questions
    const selectedModel = ai.selectModel("RESEARCH", question.length);

    const answer = await ai.chatText({
      system,
      messages,
      temperature: 0.4,
      maxTokens: 1200,
      model: selectedModel,
    });

    return NextResponse.json({
      answer,
      sourceUsed,
      citations,
      message: sourceUsed
        ? "Answer generated using uploaded course materials."
        : "Answer generated from general knowledge (no materials uploaded).",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
