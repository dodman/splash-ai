import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getProgressSummary } from "@/services/progressService";
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
