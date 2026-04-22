import OpenAI from "openai";
import { streamText, generateText, generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { z } from "zod";
import type { AIProvider } from "./types";
import type { AIMessage } from "@/types";

const EMBED_BATCH = 100;

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly chatModel: string;
  readonly embeddingModel: string;
  readonly embedDim: number;

  private readonly raw: OpenAI;
  private readonly sdk: ReturnType<typeof createOpenAI>;

  constructor(opts?: { apiKey?: string; chatModel?: string; embeddingModel?: string; embedDim?: number }) {
    const apiKey = opts?.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env or pass it explicitly to OpenAIProvider."
      );
    }
    this.raw = new OpenAI({ apiKey });
    this.sdk = createOpenAI({ apiKey });
    this.chatModel = opts?.chatModel ?? process.env.CHAT_MODEL ?? "gpt-4o-mini";
    this.embeddingModel =
      opts?.embeddingModel ?? process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
    this.embedDim = opts?.embedDim ?? Number(process.env.EMBEDDING_DIM ?? 1536);
  }

  async *chatStream(params: {
    messages: AIMessage[];
    system?: string;
    temperature?: number;
    maxTokens?: number;
  }): AsyncIterable<string> {
    const result = streamText({
      model: this.sdk(this.chatModel),
      system: params.system,
      messages: params.messages,
      temperature: params.temperature ?? 0.6,
      maxTokens: params.maxTokens,
    });
    for await (const delta of result.textStream) {
      yield delta;
    }
  }

  async chatText(params: {
    messages: AIMessage[];
    system?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const { text } = await generateText({
      model: this.sdk(this.chatModel),
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
  }): Promise<T> {
    const { object } = await generateObject<T>({
      model: this.sdk(this.chatModel),
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
