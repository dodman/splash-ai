import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { generateQuiz, generateQuizInputSchema } from "@/services/quizService";
import { handleApiError } from "@/lib/errors";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    rateLimit(`quiz:${userId}`, LIMITS.quiz);
    const body = await req.json();
    const parsed = generateQuizInputSchema.parse(body);
    const quiz = await generateQuiz(userId, parsed);
    return NextResponse.json({ quiz }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
