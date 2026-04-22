import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { deleteQuiz, getQuizForUser } from "@/services/quizService";
import { handleApiError } from "@/lib/errors";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const quiz = await getQuizForUser(userId, id);
    return NextResponse.json({ quiz });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    await deleteQuiz(userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
