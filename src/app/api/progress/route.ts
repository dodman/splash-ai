import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getProgressSummary, resetAllProgress } from "@/services/progressService";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const userId = await requireUserId();
    const summary = await getProgressSummary(userId);
    return NextResponse.json({ summary });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE() {
  try {
    const userId = await requireUserId();
    await resetAllProgress(userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
