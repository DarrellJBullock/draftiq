import "server-only";
import { deterministicFallbackProvider } from "./deterministic-provider";
import { createLLMProvider } from "./llm-provider";
import type { AIProvider } from "./types";

export type * from "./types";

let cached: AIProvider | null = null;

/**
 * Resolves which AI provider backs the assistant, server-side only:
 * - AI_PROVIDER=openai + OPENAI_API_KEY set -> OpenAI via the AI SDK
 * - AI_PROVIDER=anthropic + ANTHROPIC_API_KEY set -> Anthropic via the AI SDK
 * - anything else (including no keys configured) -> deterministic fallback
 *
 * This keeps the app fully functional with zero AI configuration, per the
 * "never require an API key to run" requirement.
 */
export async function getAIProvider(): Promise<AIProvider> {
  if (cached) return cached;

  const providerName = (process.env.AI_PROVIDER || "fallback").toLowerCase();

  if (providerName === "openai" && process.env.OPENAI_API_KEY) {
    const { openai } = await import("@ai-sdk/openai");
    cached = createLLMProvider("openai", openai(process.env.AI_MODEL || "gpt-4o-mini"));
    return cached;
  }

  if (providerName === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    const { anthropic } = await import("@ai-sdk/anthropic");
    cached = createLLMProvider("anthropic", anthropic(process.env.AI_MODEL || "claude-sonnet-4-5"));
    return cached;
  }

  cached = deterministicFallbackProvider;
  return cached;
}
