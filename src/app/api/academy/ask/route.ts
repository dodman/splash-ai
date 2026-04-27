/**
 * POST /api/academy/ask
 * Academy-to-Splash-AI service endpoint.
 * Protected by ACADEMY_API_KEY — no user session required.
 *
 * Body:
 *   courseId      string   – for logging / future scoping
 *   courseName    string   – shown to the model
 *   question      string   – student's question
 *   materials     string[] – extracted text chunks from uploaded materials
 *   studentLevel  string   – "university" | "beginner" | etc.
 *
 * Response:
 *   { answer, sourceUsed, message }
 */

import { NextResponse } from "next/server";
import { getAIProvider } from "@/providers/ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  courseId: z.string().optional(),
  courseName: z.string().optional(),
  question: z.string().trim().min(1).max(8000),
  materials: z.array(z.string()).default([]),
  studentLevel: z.string().default("university"),
});

function validateApiKey(req: Request): boolean {
  const key = req.headers.get("x-academy-key");
  const secret = process.env.ACADEMY_API_KEY;
  if (!secret) return false;          // key not configured → always reject
  return key === secret;
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

  const { question, materials, courseName, studentLevel } = body;

  // Combine materials into a single context block (cap at ~15k chars to stay
  // well within most model context windows).
  const materialText = materials
    .filter(Boolean)
    .join("\n\n---\n\n")
    .slice(0, 15_000);

  const sourceUsed = materialText.length > 0;

  const system = [
    "You are Splash AI, a helpful academic tutor.",
    courseName ? `The course is: ${courseName}.` : "",
    `Student level: ${studentLevel}.`,
    sourceUsed
      ? "Answer using the COURSE MATERIALS provided below. Be accurate and specific.\n" +
        "If the exact answer is not in the materials, say: 'This topic isn't fully covered in the uploaded materials, but based on general knowledge:' then answer.\n" +
        "End with: 'Source: course materials.' when you used the materials."
      : "Answer based on your general knowledge. Be clear and educational.",
  ]
    .filter(Boolean)
    .join("\n");

  const userContent = sourceUsed
    ? `COURSE MATERIALS:\n${materialText}\n\n---\n\nSTUDENT QUESTION:\n${question}`
    : question;

  try {
    const ai = getAIProvider();
    const answer = await ai.chatText({
      system,
      messages: [{ role: "user", content: userContent }],
      temperature: 0.4,
      maxTokens: 1200,
    });

    return NextResponse.json({
      answer,
      sourceUsed,
      message: sourceUsed
        ? "Answer generated using uploaded course materials."
        : "Answer generated from general knowledge (no materials uploaded).",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
