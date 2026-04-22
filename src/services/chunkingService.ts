// Recursive character splitter tuned for academic text.
// Targets ~500 tokens per chunk with 50 token overlap. We approximate 1 token
// ≈ 4 characters (English, LLaMA/tiktoken rough heuristic) so we don't pull in
// tiktoken as a dependency for the MVP.

export interface ChunkOptions {
  targetTokens?: number;
  overlapTokens?: number;
  separators?: string[];
}

export interface Chunk {
  content: string;
  tokenCount: number;
  chunkIndex: number;
  page?: number | null;
}

const CHARS_PER_TOKEN = 4;

const DEFAULT_SEPARATORS = [
  "\n\n\n",
  "\n\n",
  "\n",
  ". ",
  "? ",
  "! ",
  "; ",
  ", ",
  " ",
  "",
];

export function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.length / CHARS_PER_TOKEN));
}

function recursiveSplit(text: string, maxChars: number, separators: string[]): string[] {
  if (text.length <= maxChars) return [text];

  for (const sep of separators) {
    if (sep === "") break;
    if (!text.includes(sep)) continue;
    const pieces = text.split(sep);
    const results: string[] = [];
    let buf = "";
    for (const p of pieces) {
      const candidate = buf ? buf + sep + p : p;
      if (candidate.length > maxChars) {
        if (buf) results.push(buf);
        if (p.length > maxChars) {
          // recurse into this oversized piece
          results.push(...recursiveSplit(p, maxChars, separators));
          buf = "";
        } else {
          buf = p;
        }
      } else {
        buf = candidate;
      }
    }
    if (buf) results.push(buf);
    if (results.every((r) => r.length <= maxChars)) return results;
  }

  // hard fallback — slice
  const out: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) {
    out.push(text.slice(i, i + maxChars));
  }
  return out;
}

function mergeSmallNeighbours(pieces: string[], minChars: number): string[] {
  const merged: string[] = [];
  for (const p of pieces) {
    if (merged.length > 0 && merged[merged.length - 1].length < minChars) {
      merged[merged.length - 1] += " " + p;
    } else {
      merged.push(p);
    }
  }
  return merged;
}

function applyOverlap(pieces: string[], overlapChars: number): string[] {
  if (overlapChars <= 0 || pieces.length <= 1) return pieces;
  const out: string[] = [pieces[0]];
  for (let i = 1; i < pieces.length; i++) {
    const prev = pieces[i - 1];
    const tail = prev.slice(Math.max(0, prev.length - overlapChars));
    out.push(tail + " " + pieces[i]);
  }
  return out;
}

export function chunkText(text: string, opts: ChunkOptions = {}): Chunk[] {
  const target = opts.targetTokens ?? 500;
  const overlap = opts.overlapTokens ?? 50;
  const separators = opts.separators ?? DEFAULT_SEPARATORS;

  const cleaned = text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

  if (!cleaned) return [];

  const maxChars = target * CHARS_PER_TOKEN;
  const minChars = Math.floor(maxChars * 0.3);
  const overlapChars = overlap * CHARS_PER_TOKEN;

  const pieces = mergeSmallNeighbours(
    recursiveSplit(cleaned, maxChars, separators),
    minChars
  );
  const withOverlap = applyOverlap(pieces, overlapChars);

  return withOverlap.map((content, i) => ({
    content: content.trim(),
    tokenCount: estimateTokens(content),
    chunkIndex: i,
  }));
}

/** Chunk per-page text, preserving the page number on each chunk. */
export function chunkPages(
  pages: Array<{ page: number; text: string }>,
  opts: ChunkOptions = {}
): Chunk[] {
  const results: Chunk[] = [];
  let running = 0;
  for (const { page, text } of pages) {
    const chunks = chunkText(text, opts);
    for (const c of chunks) {
      results.push({ ...c, chunkIndex: running++, page });
    }
  }
  return results;
}
