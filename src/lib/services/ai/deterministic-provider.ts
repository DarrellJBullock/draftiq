import type { AIAnalysisRequest, AIAnalysisResponse, AIPlayerContext, AIProvider } from "./types";

function findMentionedPlayers(question: string, players: AIPlayerContext[]): AIPlayerContext[] {
  const lower = question.toLowerCase();
  return players.filter((p) => lower.includes(p.name.toLowerCase()));
}

function fmt(p: AIPlayerContext): string {
  const ddafl =
    p.ddaflAdjustment !== undefined && Math.round((p.ddaflAdjustment - 1) * 100) !== 0
      ? `, DDAFL est. ${p.ddaflAdjustment > 1 ? "+" : ""}${Math.round((p.ddaflAdjustment - 1) * 100)}%`
      : "";
  return `${p.name} (${p.position}${p.team ? `, ${p.team}` : ""}) -- Rank #${p.overallRank} overall / #${p.positionRank} at position, ADP ${p.adp.toFixed(1)}, projected ${p.projectedPoints.toFixed(1)} pts${ddafl}`;
}

/**
 * Rule-based, zero-cost fallback used whenever no AI provider key is
 * configured. It is strictly grounded: every claim comes from
 * `context.players`, nothing is invented.
 */
export const deterministicFallbackProvider: AIProvider = {
  name: "fallback",

  async analyze({ question, context }: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const lower = question.toLowerCase();
    const mentioned = findMentionedPlayers(question, context.players);

    if (mentioned.length >= 2) {
      const [a, b] = [...mentioned].sort((x, y) => x.overallRank - y.overallRank);
      return {
        recommendation: `Take ${a!.name}.`,
        reasoning: `${a!.name} ranks higher than ${b!.name} in current ${context.scoringFormat} rankings: ${fmt(a!)} vs ${fmt(b!)}.`,
        alternatives: mentioned.slice(2, 5).map((p) => p.name),
        risk: a!.injuryStatus !== "HEALTHY" ? `${a!.name} carries an injury designation: ${a!.injuryStatus}.` : "No significant injury flags on the recommended player.",
        confidence: 0.65,
        providerUsed: "fallback",
      };
    }

    if (lower.includes("rookie")) {
      const positionFilter = (["qb", "rb", "wr", "te"] as const).find((pos) => lower.includes(pos));
      const pool = context.players
        .filter((p) => p.isRookie && (!positionFilter || p.position.toLowerCase() === positionFilter))
        .sort((a, b) => a.overallRank - b.overallRank)
        .slice(0, 5);
      return {
        recommendation: pool[0] ? `${pool[0].name} is the top-ranked rookie${positionFilter ? ` ${positionFilter.toUpperCase()}` : ""} right now.` : "No rookies match that filter in the current pool.",
        reasoning: pool.map(fmt).join(" | ") || "No rookie data available for this filter.",
        alternatives: pool.slice(1).map((p) => p.name),
        risk: "Rookie production carries opportunity and role uncertainty regardless of ranking.",
        confidence: 0.6,
        providerUsed: "fallback",
      };
    }

    if (lower.includes("sleeper")) {
      const pool = [...context.players]
        .filter((p) => p.adp - p.overallRank > 8)
        .sort((a, b) => b.adp - b.overallRank - (a.adp - a.overallRank))
        .slice(0, 5);
      return {
        recommendation: pool[0] ? `${pool[0].name} is going well past their ranking -- a strong sleeper candidate.` : "No standout ADP-vs-rank gaps in the current pool.",
        reasoning: pool.map(fmt).join(" | ") || "No sleeper candidates found.",
        alternatives: pool.slice(1).map((p) => p.name),
        risk: "Sleeper value depends on the ADP gap holding through your actual draft.",
        confidence: 0.55,
        providerUsed: "fallback",
      };
    }

    if (lower.includes("strategy") || lower.includes("round")) {
      const top = [...context.players].sort((a, b) => a.overallRank - b.overallRank).slice(0, 5);
      return {
        recommendation: `Best players on the board right now: ${top.map((p) => p.name).join(", ")}.`,
        reasoning: `Ranked by current ${context.scoringFormat} consensus: ${top.map(fmt).join(" | ")}.`,
        alternatives: top.slice(1).map((p) => p.name),
        risk: "General board strength doesn't account for your specific roster needs -- narrow the question to a position for a tighter answer.",
        confidence: 0.5,
        providerUsed: "fallback",
      };
    }

    const top = [...context.players].sort((a, b) => a.overallRank - b.overallRank).slice(0, 5);
    return {
      recommendation: top[0] ? `${top[0].name} grades out as the best player available.` : "No player data available to answer this question.",
      reasoning: top.map(fmt).join(" | ") || "No grounding data was provided for this request.",
      alternatives: top.slice(1).map((p) => p.name),
      risk: "This is a general best-available answer -- for a sharper read, mention specific player names, a position, or 'rookie'/'sleeper'.",
      confidence: 0.4,
      providerUsed: "fallback",
    };
  },
};
