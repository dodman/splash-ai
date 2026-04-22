// Simple in-memory token bucket. Good enough for MVP / single-node.
// For production multi-node, swap for @upstash/ratelimit.
import { RateLimitError } from "./errors";

type Bucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, Bucket>();

interface LimitOptions {
  /** Max tokens (burst) */
  capacity: number;
  /** Tokens refilled per second */
  refillPerSecond: number;
}

export function rateLimit(key: string, opts: LimitOptions): void {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: opts.capacity, updatedAt: now };
  const elapsed = (now - b.updatedAt) / 1000;
  b.tokens = Math.min(opts.capacity, b.tokens + elapsed * opts.refillPerSecond);
  b.updatedAt = now;

  if (b.tokens < 1) {
    buckets.set(key, b);
    throw new RateLimitError("Rate limit exceeded. Please try again in a moment.");
  }

  b.tokens -= 1;
  buckets.set(key, b);
}

export const LIMITS = {
  chat: { capacity: 10, refillPerSecond: 0.5 },      // ~30 req/min sustained
  upload: { capacity: 3, refillPerSecond: 10 / 60 }, // ~10 req/min
  register: { capacity: 5, refillPerSecond: 5 / 60 },
  quiz: { capacity: 5, refillPerSecond: 10 / 60 },
} as const;
