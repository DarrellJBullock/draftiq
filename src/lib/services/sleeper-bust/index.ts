import type { InjuryStatus, RiskLevel } from "@prisma/client";

export interface SleeperInput {
  adp: number;
  overallRank: number;
  isRookie: boolean;
  returningFromInjury: boolean;
  opportunityScore?: number; // 0-100, rookies mostly
}

export interface SleeperResult {
  sleeperScore: number;
  reasons: string[];
  idealDraftRangeStart: number;
  idealDraftRangeEnd: number;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/** A sleeper is someone the market (ADP) is undervaluing relative to their ranked/projected worth. */
export function computeSleeperScore(input: SleeperInput): SleeperResult {
  const adpGap = input.adp - input.overallRank; // positive = ADP later than rank -> value
  const reasons: string[] = [];

  let score = clamp01(0.5 + adpGap / 60) * 70;
  if (adpGap > 12) reasons.push(`Going ${Math.round(adpGap)} picks later than their ranking suggests`);

  if (input.isRookie) {
    score += 10;
    reasons.push("Rookie with unpriced-in opportunity");
  }
  if (input.returningFromInjury) {
    score += 8;
    reasons.push("Coming off injury, ADP hasn't caught up to full health");
  }
  if (input.opportunityScore && input.opportunityScore > 70) {
    score += 10;
    reasons.push("Strong opportunity score for their situation");
  }

  return {
    sleeperScore: Math.round(clamp01(score / 100) * 1000) / 10,
    reasons,
    idealDraftRangeStart: Math.max(1, Math.round(input.adp - 12)),
    idealDraftRangeEnd: Math.max(1, Math.round(input.adp - 2)),
  };
}

export interface BustInput {
  adp: number;
  overallRank: number;
  age: number | null;
  riskLevel: RiskLevel;
  injuryStatus: InjuryStatus;
  trend: string | null; // "rising" | "falling" | "stable"
}

export interface BustResult {
  bustScore: number;
  riskFactors: string[];
  suggestedDraftRangeStart: number;
  suggestedDraftRangeEnd: number;
}

const RISK_WEIGHT: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 15, HIGH: 30 };

/** A bust risk is someone the market is pricing above their ranked/underlying worth. */
export function computeBustScore(input: BustInput): BustResult {
  const adpInflation = input.overallRank - input.adp; // positive = being drafted earlier than rank supports
  const riskFactors: string[] = [];

  let score = clamp01(0.5 + adpInflation / 60) * 55;
  if (adpInflation > 12) riskFactors.push(`ADP is ${Math.round(adpInflation)} picks ahead of their underlying ranking`);

  score += RISK_WEIGHT[input.riskLevel];
  if (input.riskLevel === "HIGH") riskFactors.push("Flagged as high injury/usage risk");

  if (input.age && input.age >= 30) {
    score += 10;
    riskFactors.push("Age-related decline risk (30+)");
  }
  if (input.injuryStatus !== "HEALTHY") {
    score += 10;
    riskFactors.push(`Current injury designation: ${input.injuryStatus}`);
  }
  if (input.trend === "falling") {
    score += 8;
    riskFactors.push("Usage/production trending down");
  }

  return {
    bustScore: Math.round(clamp01(score / 100) * 1000) / 10,
    riskFactors,
    suggestedDraftRangeStart: Math.max(1, Math.round(input.adp + 5)),
    suggestedDraftRangeEnd: Math.max(1, Math.round(input.adp + 20)),
  };
}
