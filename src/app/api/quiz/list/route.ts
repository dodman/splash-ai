import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { listQuizzes, deleteAllQuizzes } from "@/services/quizService";
import { handleApiError } from "@/lib/errors";

export async function DELETE() {
  try {
    const userId = await requireUserId();
    await deleteAllQuizzes(userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

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
