import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { listQuizzes } from "@/services/quizService";
import { handleApiError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const courseIdParam = url.searchParams.get("courseId");
    const courseId =
      courseIdParam === null ? undefined : courseIdParam === "" ? null : courseIdParam;
    const quizzes = await listQuizzes(userId, courseId);
    return NextResponse.json({ quizzes });
  } catch (err) {
    return handleApiError(err);
  }
}
