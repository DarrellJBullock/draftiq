import "server-only";
import { generateObject } from "ai";
import { AI_RESPONSE_SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { aiResponseSchema } from "./schema";
import type { AIAnalysisRequest, AIAnalysisResponse, AIProvider } from "./types";
import { deterministicFallbackProvider } from "./deterministic-provider";

/** Shared plumbing for any AI SDK `LanguageModel`-backed provider (OpenAI, Anthropic, ...). */
export function createLLMProvider(name: string, model: Parameters<typeof generateObject>[0]["model"]): AIProvider {
  return {
    name,
    async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
      try {
        const { object } = await generateObject({
          model,
          schema: aiResponseSchema,
          system: AI_RESPONSE_SYSTEM_PROMPT,
          prompt: buildUserPrompt(request),
        });
        return { ...object, providerUsed: name };
      } catch (error) {
        console.error(`[ai:${name}] generation failed, falling back to deterministic provider`, error);
        const fallback = await deterministicFallbackProvider.analyze(request);
        return { ...fallback, providerUsed: `${name}-fallback` };
      }
    },
  };
}
