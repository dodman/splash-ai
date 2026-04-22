import { prisma } from "@/lib/prisma";
import { embedOne, toPgVectorLiteral } from "./embeddingService";
import type { RetrievedChunk } from "@/types";

type Row = {
  id: string;
  materialId: string;
  chunkIndex: number;
  content: string;
  page: number | null;
  filename: string;
  score: number;
};

export async function similaritySearch(params: {
  courseId: string;
  query: string;
  k?: number;
}): Promise<RetrievedChunk[]> {
  const k = params.k ?? 6;
  const queryEmbedding = await embedOne(params.query);
  return searchByEmbedding({ courseId: params.courseId, embedding: queryEmbedding, k });
}

export async function searchByEmbedding(params: {
  courseId: string;
  embedding: number[];
  k?: number;
}): Promise<RetrievedChunk[]> {
  const k = params.k ?? 6;
  const literal = toPgVectorLiteral(params.embedding);

  // pgvector cosine distance = 1 - cosine similarity. Lower is better.
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `
    SELECT
      c.id,
      c."materialId"   as "materialId",
      c."chunkIndex"   as "chunkIndex",
      c.content,
      c.page,
      m.filename,
      (c.embedding <=> $1::vector)::float as score
    FROM "MaterialChunk" c
    JOIN "CourseMaterial" m ON m.id = c."materialId"
    WHERE m."courseId" = $2
      AND m.status = 'READY'
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> $1::vector ASC
    LIMIT $3
    `,
    literal,
    params.courseId,
    k
  );

  return rows.map((r) => ({
    id: r.id,
    materialId: r.materialId,
    chunkIndex: r.chunkIndex,
    content: r.content,
    page: r.page,
    filename: r.filename,
    score: 1 - r.score, // cosine similarity (higher is better)
  }));
}

export function formatSourcesForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "(No course materials have been uploaded yet for this topic.)";
  }
  return chunks
    .map((c, i) => {
      const pageTag = c.page ? ` · page ${c.page}` : "";
      return `[SOURCE ${i + 1} — ${c.filename}${pageTag}]\n${c.content}`;
    })
    .join("\n\n---\n\n");
}
