import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processMaterialFromUrl } from "@/services/uploadService";
import { handleApiError } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/octet-stream",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname: string, clientPayload: string | null) => {
        // Validate that the user owns the course
        const userId = await requireUserId();
        const { materialId, courseId } = JSON.parse(clientPayload || "{}");

        if (!courseId || !materialId) {
          throw new Error("Missing courseId or materialId in clientPayload");
        }

        // Verify the material belongs to this user's course
        const material = await prisma.courseMaterial.findUnique({
          where: { id: materialId },
          include: { course: { select: { ownerId: true } } },
        });
        if (!material || material.course.ownerId !== userId) {
          throw new Error("Unauthorized");
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: 25 * 1024 * 1024, // 25 MB
          addRandomSuffix: true, // prevent "blob already exists" on repeated uploads
          tokenPayload: JSON.stringify({ userId, materialId, filename: material.filename }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const { materialId, filename } = JSON.parse(tokenPayload || "{}");

        // Update the material record with the real blob URL
        await prisma.courseMaterial.update({
          where: { id: materialId },
          data: {
            storageKey: blob.url,
            mimeType: blob.contentType || "application/octet-stream",
          },
        });

        // Process the file: parse → chunk → embed
        await processMaterialFromUrl(
          materialId,
          blob.url,
          blob.contentType || "application/octet-stream",
          filename
        );
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    return handleApiError(err);
  }
}
