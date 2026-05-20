import { randomUUID } from "node:crypto";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDocumentFromBuffer } from "./pdfParserService";
import { chunkPages } from "./chunkingService";
import { embedBatch, toPgVectorLiteral } from "./embeddingService";
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/octet-stream", // some browsers report this for .md
]);
const ALLOWED_EXT = /\.(pdf|txt|md|markdown)$/i;

const MAX_MB = Number(process.env.MAX_UPLOAD_MB ?? 25);

function assertValidFile(params: { filename: string; mimeType: string; size: number }) {
  if (params.size <= 0) throw new ValidationError("Empty file");
  if (params.size > MAX_MB * 1024 * 1024) {
    throw new ValidationError(`File too large (max ${MAX_MB}MB)`);
  }
  const mimeOk = ALLOWED_MIME.has(params.mimeType);
  const extOk = ALLOWED_EXT.test(params.filename);
  if (!mimeOk && !extOk) {
    throw new ValidationError(
      `Unsupported file type. Allowed: PDF, TXT, MD (got ${params.mimeType || "unknown"})`
    );
  }
}

export async function createMaterialFromUpload(params: {
  userId: string;
  courseId: string;
  filename: string;
  mimeType: string;
  data: Buffer;
}) {
  const course = await prisma.course.findUnique({ where: { id: params.courseId } });
  if (!course) throw new NotFoundError("Course not found");
  if (course.ownerId !== params.userId) throw new ForbiddenError();

  assertValidFile({
    filename: params.filename,
    mimeType: params.mimeType,
    size: params.data.length,
  });

  // Generate a stable storageKey without writing to disk.
  // Vercel's filesystem is read-only (/var/task) and /tmp is ephemeral,
  // so we process entirely from the in-memory buffer.
  const safeName = path.basename(params.filename).replace(/[^\w.\-]/g, "_");
  const storageKey = `${randomUUID()}__${safeName}`;

  const material = await prisma.courseMaterial.create({
    data: {
      courseId: params.courseId,
      filename: params.filename,
      mimeType: params.mimeType,
      size: params.data.length,
      storageKey,
      status: "PENDING",
    },
  });

  // Process synchronously before returning — Vercel terminates serverless
  // functions after the response is sent, so background void tasks are unreliable.
  try {
    await processMaterialFromBuffer(material.id, params.data, params.mimeType, params.filename);
  } catch (err) {
    // processMaterial already persisted status=FAILED; just log here.
    // eslint-disable-next-line no-console
    console.error(`[upload] Failed to process material ${material.id}:`, err);
  }

  const updated = await prisma.courseMaterial.findUnique({ where: { id: material.id } });
  return updated ?? material;
}

/**
 * Process a material from an in-memory buffer.
 * Used on Vercel where the filesystem is read-only.
 */
export async function processMaterialFromBuffer(
  materialId: string,
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<void> {
  const material = await prisma.courseMaterial.findUnique({ where: { id: materialId } });
  if (!material) return;

  try {
    await prisma.courseMaterial.update({
      where: { id: materialId },
      data: { status: "PROCESSING", error: null },
    });

    const parsed = await parseDocumentFromBuffer(buffer, mimeType, filename);
    const chunks = chunkPages(parsed.pages);

    if (chunks.length === 0) {
      await prisma.courseMaterial.update({
        where: { id: materialId },
        data: { status: "FAILED", error: "No text could be extracted from the file." },
      });
      return;
    }

    const embeddings = await embedBatch(chunks.map((c) => c.content));

    await prisma.materialChunk.deleteMany({ where: { materialId } });
    await prisma.materialChunk.createMany({
      data: chunks.map((c) => ({
        materialId,
        chunkIndex: c.chunkIndex,
        content: c.content,
        tokenCount: c.tokenCount,
        page: c.page ?? null,
      })),
    });
    for (let i = 0; i < chunks.length; i++) {
      const literal = toPgVectorLiteral(embeddings[i]);
      await prisma.$executeRaw(
        Prisma.sql`
          UPDATE "MaterialChunk"
          SET embedding = ${Prisma.raw(`'${literal}'`)}::vector
          WHERE "materialId" = ${materialId} AND "chunkIndex" = ${chunks[i].chunkIndex}
        `
      );
    }

    await prisma.courseMaterial.update({
      where: { id: materialId },
      data: {
        status: "READY",
        pages: parsed.pageCount,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.courseMaterial.update({
      where: { id: materialId },
      data: { status: "FAILED", error: message.slice(0, 500) },
    });
    throw err;
  }
}

/** @deprecated Use processMaterialFromBuffer for new uploads. */
export async function processMaterial(materialId: string): Promise<void> {
  const material = await prisma.courseMaterial.findUnique({ where: { id: materialId } });
  if (!material) return;

  try {
    await prisma.courseMaterial.update({
      where: { id: materialId },
      data: { status: "PROCESSING", error: null },
    });

    const { parseDocument } = await import("./pdfParserService");
    const parsed = await parseDocument(material.storageKey, material.mimeType, material.filename);
    const chunks = chunkPages(parsed.pages);

    if (chunks.length === 0) {
      await prisma.courseMaterial.update({
        where: { id: materialId },
        data: { status: "FAILED", error: "No text could be extracted from the file." },
      });
      return;
    }

    const embeddings = await embedBatch(chunks.map((c) => c.content));

    // Neon's PgBouncer pooler doesn't support interactive transactions —
    // run sequentially without a wrapper instead.
    await prisma.materialChunk.deleteMany({ where: { materialId } });
    await prisma.materialChunk.createMany({
      data: chunks.map((c) => ({
        materialId,
        chunkIndex: c.chunkIndex,
        content: c.content,
        tokenCount: c.tokenCount,
        page: c.page ?? null,
      })),
    });
    for (let i = 0; i < chunks.length; i++) {
      const literal = toPgVectorLiteral(embeddings[i]);
      await prisma.$executeRaw(
        Prisma.sql`
          UPDATE "MaterialChunk"
          SET embedding = ${Prisma.raw(`'${literal}'`)}::vector
          WHERE "materialId" = ${materialId} AND "chunkIndex" = ${chunks[i].chunkIndex}
        `
      );
    }

    await prisma.courseMaterial.update({
      where: { id: materialId },
      data: {
        status: "READY",
        pages: parsed.pageCount,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.courseMaterial.update({
      where: { id: materialId },
      data: { status: "FAILED", error: message.slice(0, 500) },
    });
    throw err;
  }
}

export async function deleteMaterial(params: { userId: string; materialId: string }) {
  const material = await prisma.courseMaterial.findUnique({
    where: { id: params.materialId },
    include: { course: true },
  });
  if (!material) throw new NotFoundError("Material not found");
  if (material.course.ownerId !== params.userId) throw new ForbiddenError();

  // Best-effort removal from local storage (no-ops gracefully on Vercel
  // since storageKey is an ephemeral /tmp path that no longer exists).
  const { getStorageProvider } = await import("@/providers/storage");
  await getStorageProvider().remove(material.storageKey).catch(() => {});
  await prisma.courseMaterial.delete({ where: { id: material.id } });
}

export async function getMaterialForUser(params: { userId: string; materialId: string }) {
  const material = await prisma.courseMaterial.findUnique({
    where: { id: params.materialId },
    include: { course: { select: { ownerId: true } }, _count: { select: { chunks: true } } },
  });
  if (!material) throw new NotFoundError("Material not found");
  if (material.course.ownerId !== params.userId) throw new ForbiddenError();
  return material;
}
