import type { z } from "zod";
import type { AIMessage } from "@/types";

export interface AIProvider {
  readonly name: string;
  readonly chatModel: string;
  readonly embeddingModel: string;
  readonly embedDim: number;

  /** Stream plain text tokens for a chat completion. */
  chatStream(params: {
    messages: AIMessage[];
    system?: string;
    temperature?: number;
    maxTokens?: number;
  }): AsyncIterable<string>;

  /** Non-streaming plain-text completion. */
  chatText(params: {
    messages: AIMessage[];
    system?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string>;

  /** Structured JSON completion validated with a Zod schema. */
  chatJSON<T>(params: {
    messages: AIMessage[];
    system?: string;
    schema: z.ZodType<T>;
    temperature?: number;
  }): Promise<T>;

  /** Batch embedding. Should handle batch size internally. */
  embed(texts: string[]): Promise<number[][]>;
}
