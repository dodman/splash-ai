import { getAIProvider } from "@/providers/ai";

interface EmbedOptions {
  maxRetries?: number;
}

export async function embedBatch(
  texts: string[],
  opts: EmbedOptions = {}
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const provider = getAIProvider();
  const maxRetries = opts.maxRetries ?? 3;

  let attempt = 0;
  let lastError: unknown;
  while (attempt < maxRetries) {
    try {
      return await provider.embed(texts);
    } catch (err) {
      lastError = err;
      attempt++;
      const backoff = Math.min(2000 * 2 ** (attempt - 1), 15_000);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw new Error(
    `Embedding failed after ${maxRetries} retries: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

export async function embedOne(text: string): Promise<number[]> {
  const [vec] = await embedBatch([text]);
  return vec;
}

/** Postgres vector literal: "[0.1,0.2,...]" — safe to pass via $executeRaw. */
export function toPgVectorLiteral(vec: number[]): string {
  return `[${vec.map((n) => (Number.isFinite(n) ? n.toString() : "0")).join(",")}]`;
}
