import type { Position, RiskLevel } from "@prisma/client";
import type { ValueResult } from "../value-engine";

export interface RecommendationCandidate {
  id: string;
  name: string;
  position: Position;
  overallRank: number;
  adp: number;
  projectedPoints: number;
  isRookie: boolean;
  riskLevel: RiskLevel;
  value: ValueResult;
}

export function getBestAvailable(pool: RecommendationCandidate[], limit = 10): RecommendationCandidate[] {
  return [...pool].sort((a, b) => a.overallRank - b.overallRank).slice(0, limit);
}

export function getBestValue(pool: RecommendationCandidate[], limit = 10): RecommendationCandidate[] {
  return [...pool].sort((a, b) => b.value.draftValue - a.value.draftValue).slice(0, limit);
}

export function getRookieTargets(pool: RecommendationCandidate[], limit = 10): RecommendationCandidate[] {
  return pool
    .filter((p) => p.isRookie)
    .sort((a, b) => b.value.overallValue - a.value.overallValue)
    .slice(0, limit);
}

export function getSafePicks(pool: RecommendationCandidate[], limit = 10): RecommendationCandidate[] {
  return pool
    .filter((p) => p.riskLevel === "LOW")
    .sort((a, b) => b.value.riskAdjustedValue - a.value.riskAdjustedValue)
    .slice(0, limit);
}

export function getHighUpside(pool: RecommendationCandidate[], limit = 10): RecommendationCandidate[] {
  return [...pool].sort((a, b) => b.value.upsideScore - a.value.upsideScore).slice(0, limit);
}

export interface WhoShouldIDraftResult {
  playerId: string;
  recommendation: "Strong Draft" | "Good Value" | "Reasonable" | "Reach" | "Avoid";
  valueScore: number;
  needScore: number;
  riskScore: number;
  upside: number;
  alternatives: RecommendationCandidate[];
}

const RISK_SCORE: Record<RiskLevel, number> = { LOW: 20, MEDIUM: 55, HIGH: 85 };

/** "Who Should I Draft?" -- evaluates one candidate against the rest of the available pool. */
export function whoShouldIDraft(
  candidate: RecommendationCandidate,
  pool: RecommendationCandidate[],
  rosterNeed: number
): WhoShouldIDraftResult {
  const valueScore = candidate.value.overallValue;
  const needScore = Math.round(rosterNeed * 100);
  const riskScore = RISK_SCORE[candidate.riskLevel];
  const upside = candidate.value.upsideScore;

  const composite = valueScore * 0.5 + needScore * 0.3 - riskScore * 0.1 + upside * 0.1;
  const recommendation: WhoShouldIDraftResult["recommendation"] =
    composite >= 75 ? "Strong Draft" : composite >= 60 ? "Good Value" : composite >= 45 ? "Reasonable" : composite >= 30 ? "Reach" : "Avoid";

  const alternatives = pool
    .filter((p) => p.id !== candidate.id && p.position === candidate.position)
    .sort((a, b) => b.value.overallValue - a.value.overallValue)
    .slice(0, 3);

  return { playerId: candidate.id, recommendation, valueScore, needScore, riskScore, upside, alternatives };
}
