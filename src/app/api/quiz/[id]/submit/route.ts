import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { submitQuizAttempt, quizSubmissionSchema } from "@/services/quizService";
import { handleApiError } from "@/lib/errors";

export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const body = await req.json();
    const parsed = quizSubmissionSchema.parse(body);
    const result = await submitQuizAttempt(userId, id, parsed);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
