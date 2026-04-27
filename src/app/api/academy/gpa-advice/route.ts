/**
 * POST /api/academy/gpa-advice
 * Splash AI endpoint for Splash Academy's GPA Tracker.
 * Protected by ACADEMY_API_KEY — no user session required.
 *
 * Body:
 *   studentName  string?   – display name (optional)
 *   gpaSummary   object    – { cumulativeGPA, totalCredits, classification, yearlyBreakdown }
 *   courses      object[]  – list of { name, year, semester?, courseType, creditHours, grade, gradePoints }
 *   question     string    – student's question
 *
 * Response:
 *   { answer: string, recommendations: string[] }
 */

import { NextResponse } from "next/server";
import { getAIProvider } from "@/providers/ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const courseSchema = z.object({
  name: z.string().optional(),
  year: z.string().optional(),
  semester: z.string().optional().nullable(),
  courseType: z.string().optional(),
  creditHours: z.number().optional(),
  grade: z.string().optional(),
  gradePoints: z.number().optional(),
});

const bodySchema = z.object({
  studentName: z.string().optional(),
  gpaSummary: z.object({
    cumulativeGPA: z.number().optional(),
    totalCredits: z.number().optional(),
    classification: z.string().optional(),
    yearlyBreakdown: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  courses: z.array(courseSchema).default([]),
  question: z.string().trim().min(1).max(2000),
});

const responseSchema = z.object({
  answer: z.string().min(10),
  recommendations: z.array(z.string()).min(0).max(8),
});

function validateApiKey(req: Request): boolean {
  const key = req.headers.get("x-academy-key");
  const secret = process.env.ACADEMY_API_KEY;
  if (!secret) return false;
  return key === secret;
}

function buildContext(body: z.infer<typeof bodySchema>): string {
  const lines: string[] = [];
  if (body.studentName) lines.push(`Student: ${body.studentName}`);
  const s = body.gpaSummary ?? {};
  if (s.cumulativeGPA !== undefined) lines.push(`Cumulative GPA: ${s.cumulativeGPA}`);
  if (s.totalCredits !== undefined) lines.push(`Total Credits: ${s.totalCredits}`);
  if (s.classification) lines.push(`Current Classification: ${s.classification}`);

  if (s.yearlyBreakdown && Object.keys(s.yearlyBreakdown).length > 0) {
    lines.push("\nYearly Breakdown:");
    for (const [year, val] of Object.entries(s.yearlyBreakdown)) {
      lines.push(`  ${year}: ${JSON.stringify(val)}`);
    }
  }

  if (body.courses.length > 0) {
    lines.push("\nAll Courses:");
    for (const c of body.courses) {
      const semPart = c.semester ? ` ${c.semester}` : "";
      lines.push(
        `  - ${c.name ?? "(untitled)"} | ${c.year ?? "?"}${semPart} | ${c.courseType ?? "?"} course | ${c.creditHours ?? "?"} credits | ${c.grade ?? "?"} (${c.gradePoints ?? "?"} pts)`
      );
    }
  }

  return lines.join("\n");
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

  const context = buildContext(body);

  const system = `You are Splash AI, a kind and practical academic advisor for university students.
You explain academic performance in simple, encouraging language — never patronising, never dishonest.
You ALWAYS reason from the student's actual GPA data, not generic advice.

UNZA grade scale (5-point):
  A+ = 5  (90-100%)
  A  = 4  (80-89%)
  B+ = 3  (70-79%)
  B  = 2  (60-69%)
  C+ = 1  (50-59%)
  C, D+, D, F, P, NE, LT, INC = 0

Classifications:
  Distinction  ≥ 3.75
  Meritorious  ≥ 3.25
  Credit       ≥ 2.68
  Pass         < 2.68

Return:
  - "answer": 2–4 short paragraphs in friendly student-facing language. Use the student's actual numbers.
  - "recommendations": 3–5 concrete, actionable next steps tailored to their data.

Do NOT invent courses or grades that aren't in the data.`;

  const userPrompt = `STUDENT'S ACADEMIC DATA:
${context || "(no data provided)"}

STUDENT'S QUESTION:
${body.question}`;

  try {
    const ai = getAIProvider();
    const result = await ai.chatJSON({
      system,
      messages: [{ role: "user", content: userPrompt }],
      schema: responseSchema,
      temperature: 0.4,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
