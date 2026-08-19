import type { AIAnalysisRequest } from "./types";

export const AI_RESPONSE_SYSTEM_PROMPT = `You are DraftIQ's fantasy football draft assistant.

Rules:
- Only use facts about players (rankings, ADP, projections, tiers, injury status) that appear in the JSON context you are given. Never invent or estimate a stat that isn't present.
- If the context doesn't contain enough information to answer confidently, say so in "reasoning" and lower "confidence" instead of guessing.
- Keep "recommendation" to one or two sentences. Put supporting detail in "reasoning".
- "alternatives" should be player names from the context, not new suggestions.
- "risk" should call out injury status, role uncertainty, or ranking volatility when relevant.
- "confidence" is a 0-1 float reflecting how well the context supports your answer.`;

export function buildUserPrompt(request: AIAnalysisRequest): string {
  return [
    `League context: ${request.context.season} season, ${request.context.scoringFormat} scoring${
      request.context.leagueSize ? `, ${request.context.leagueSize}-team league` : ""
    }${request.context.draftPosition ? `, drafting from position ${request.context.draftPosition}` : ""}.`,
    request.context.rosterNeeds?.length ? `Current roster needs: ${request.context.rosterNeeds.join(", ")}.` : "",
    `Player context (JSON, the only source of truth for stats): ${JSON.stringify(request.context.players)}`,
    `Question: ${request.question}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
