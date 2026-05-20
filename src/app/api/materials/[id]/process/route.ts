import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processMaterialFromUrl } from "@/services/uploadService";
import { handleApiError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id: materialId } = await params;

    const material = await prisma.courseMaterial.findUnique({
      where: { id: materialId },
      include: { course: { select: { ownerId: true } } },
    });
    if (!material) throw new NotFoundError("Material not found");
    if (material.course.ownerId !== userId) throw new ForbiddenError();

    // Only process if still pending (avoid double-processing)
    if (material.status === "READY") {
      return NextResponse.json({ material });
    }

    const { blobUrl } = await req.json().catch(() => ({}));
    if (!blobUrl || typeof blobUrl !== "string") {
      throw new ValidationError("Missing blobUrl");
    }

    // Atomically claim the job — only one invocation proceeds
    const claimed = await prisma.courseMaterial.updateMany({
      where: { id: materialId, status: { in: ["PENDING", "FAILED"] } },
      data: { status: "PROCESSING", storageKey: blobUrl, error: null },
    });

    if (claimed.count === 0) {
      // Already being processed or READY — return current state
      const current = await prisma.courseMaterial.findUnique({ where: { id: materialId } });
      return NextResponse.json({ material: current });
    }

    await processMaterialFromUrl(materialId, blobUrl, material.mimeType, material.filename);

    const updated = await prisma.courseMaterial.findUnique({ where: { id: materialId } });
    return NextResponse.json({ material: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
