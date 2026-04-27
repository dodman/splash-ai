import type { z } from "zod";
import type { AIMessage } from "@/types";

export interface ChatStreamResult {
  stream: AsyncIterable<string>;
  /** Resolves with token counts once streaming finishes (may be undefined if not available) */
  usage?: Promise<{ promptTokens: number; completionTokens: number; totalTokens: number } | null>;
}

export interface AIProvider {
  readonly name: string;
  readonly chatModel: string;
  readonly embeddingModel: string;
  readonly embedDim: number;

  /** Stream plain text tokens. Returns the stream plus a lazy usage promise. */
  chatStream(params: {
    messages: AIMessage[];
    system?: string;
    temperature?: number;
    maxTokens?: number;
    /** Override the default model for this call (smart routing) */
    model?: string;
  }): AsyncIterable<string> & { usagePromise?: Promise<UsageSummary | null> };

  /** Non-streaming plain-text completion. */
  chatText(params: {
    messages: AIMessage[];
    system?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
  }): Promise<string>;

  /** Structured JSON completion validated with a Zod schema. */
  chatJSON<T>(params: {
    messages: AIMessage[];
    system?: string;
    schema: z.ZodType<T>;
    temperature?: number;
    model?: string;
  }): Promise<T>;

  /** Batch embedding. Handles batch size internally. */
  embed(texts: string[]): Promise<number[][]>;

  /**
   * Select the optimal model for a given mode and message.
   * Returns the model name string to pass to chatStream / chatText.
   */
  selectModel(mode: string, messageLength?: number): string;
}

export interface UsageSummary {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
