import OpenAI from "openai";
import { streamText, generateText, generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { z } from "zod";
import type { AIProvider, UsageSummary } from "./types";
import type { AIMessage } from "@/types";

const EMBED_BATCH = 100;

/**
 * Model tiers.
 * FAST_MODEL  — gpt-4o-mini  (default, cheap, very capable for most tasks)
 * SMART_MODEL — gpt-4o        (reasoning-heavy: CODE, RESEARCH, complex maths)
 * Both are configurable via env so you can swap models without code changes.
 */
const FAST_MODEL = process.env.CHAT_MODEL ?? "gpt-4o-mini";
const SMART_MODEL = process.env.REASONING_MODEL ?? "gpt-4o";

/** Modes that benefit from the smarter model */
const SMART_MODE_SET = new Set(["CODE", "RESEARCH"]);
/** Message length threshold above which WRITE/BUSINESS/GENERAL escalate to smart model */
const SMART_MSG_THRESHOLD = 800;

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly chatModel: string;
  readonly embeddingModel: string;
  readonly embedDim: number;

  private readonly raw: OpenAI;
  private readonly sdk: ReturnType<typeof createOpenAI>;

  constructor(opts?: {
    apiKey?: string;
    chatModel?: string;
    embeddingModel?: string;
    embedDim?: number;
  }) {
    const apiKey = opts?.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env or pass it explicitly to OpenAIProvider."
      );
    }
    this.raw = new OpenAI({ apiKey });
    this.sdk = createOpenAI({ apiKey });
    this.chatModel = opts?.chatModel ?? FAST_MODEL;
    this.embeddingModel =
      opts?.embeddingModel ?? process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
    this.embedDim = opts?.embedDim ?? Number(process.env.EMBEDDING_DIM ?? 1536);
  }

  /** Pick the best model for the given mode + message length */
  selectModel(mode: string, messageLength = 0): string {
    if (SMART_MODE_SET.has(mode)) return SMART_MODEL;
    // Long, complex messages in any mode get a bump
    if (messageLength > SMART_MSG_THRESHOLD) return SMART_MODEL;
    return FAST_MODEL;
  }

  chatStream(params: {
    messages: AIMessage[];
    system?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
  }): AsyncIterable<string> & { usagePromise?: Promise<UsageSummary | null> } {
    const model = params.model ?? this.chatModel;
    const sdk = this.sdk;

    // External resolver so the generator can populate usage after streaming ends.
    let resolveUsage!: (v: UsageSummary | null) => void;
    const usagePromise = new Promise<UsageSummary | null>((res) => {
      resolveUsage = res;
    });

    async function* gen(): AsyncGenerator<string> {
      const result = streamText({
        model: sdk(model),
        system: params.system,
        messages: params.messages,
        temperature: params.temperature ?? 0.6,
        maxTokens: params.maxTokens,
        // onFinish fires on successful completion and resolves usage.
        onFinish({ usage }) {
          resolveUsage(
            usage
              ? {
                  promptTokens: usage.promptTokens,
                  completionTokens: usage.completionTokens,
                  totalTokens: usage.totalTokens,
                }
              : null
          );
        },
      });

      try {
        for await (const delta of result.textStream) {
          yield delta;
        }
      } catch (err) {
        resolveUsage(null); // ensure usage promise doesn't hang on error
        throw err;
      }

      // Fallback: if onFinish was never called (e.g. API error with no tokens),
      // resolve with null so the chat route never hangs waiting for usage.
      resolveUsage(null);
    }

    // Attach usagePromise as a non-enumerable property on the generator object.
    return Object.assign(gen(), { usagePromise });
  }

  async chatText(params: {
    messages: AIMessage[];
    system?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
  }): Promise<string> {
    const model = params.model ?? this.chatModel;
    const { text } = await generateText({
      model: this.sdk(model),
      system: params.system,
      messages: params.messages,
      temperature: params.temperature ?? 0.4,
      maxTokens: params.maxTokens,
    });
    return text;
  }

  async chatJSON<T>(params: {
    messages: AIMessage[];
    system?: string;
    schema: z.ZodType<T>;
    temperature?: number;
    model?: string;
  }): Promise<T> {
    const model = params.model ?? this.chatModel;
    const { object } = await generateObject<T>({
      model: this.sdk(model),
      system: params.system,
      messages: params.messages,
      schema: params.schema,
      temperature: params.temperature ?? 0.3,
    });
    return object;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += EMBED_BATCH) {
      const batch = texts.slice(i, i + EMBED_BATCH);
      const res = await this.raw.embeddings.create({
        model: this.embeddingModel,
        input: batch,
      });
      for (const item of res.data) out.push(item.embedding);
    }
    return out;
  }
}
