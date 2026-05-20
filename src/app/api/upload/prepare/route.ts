import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prepareMaterialForBlobUpload } from "@/services/uploadService";
import { handleApiError, ValidationError } from "@/lib/errors";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    rateLimit(`upload:${userId}`, LIMITS.upload);

    const body = await req.json();
    const { filename, mimeType, courseId } = body ?? {};

    if (!filename || typeof filename !== "string") {
      throw new ValidationError("Missing filename.");
    }
    if (!courseId || typeof courseId !== "string") {
      throw new ValidationError("Missing courseId.");
    }

    const material = await prepareMaterialForBlobUpload({
      userId,
      courseId,
      filename,
      mimeType: mimeType || "application/octet-stream",
    });

    return NextResponse.json({ material }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
