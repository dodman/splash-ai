import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { createMaterialFromUpload } from "@/services/uploadService";
import { handleApiError, ValidationError } from "@/lib/errors";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    rateLimit(`upload:${userId}`, LIMITS.upload);

    const form = await req.formData();
    const file = form.get("file");
    const courseId = form.get("courseId");

    if (!(file instanceof File)) {
      throw new ValidationError("No file provided (expected multipart field 'file').");
    }
    if (typeof courseId !== "string" || !courseId) {
      throw new ValidationError("Missing courseId.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const material = await createMaterialFromUpload({
      userId,
      courseId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      data: buffer,
    });

    return NextResponse.json({ material }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
