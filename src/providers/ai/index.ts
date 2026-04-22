import type { AIProvider } from "./types";
import { OpenAIProvider } from "./openai";

let instance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (instance) return instance;
  const name = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
  switch (name) {
    case "openai":
      instance = new OpenAIProvider();
      return instance;
    // future: anthropic, google — implement AIProvider + return here.
    default:
      throw new Error(`Unknown AI_PROVIDER "${name}". Supported: openai`);
  }
}

export function resetAIProvider() {
  instance = null;
}

export type { AIProvider } from "./types";
