import type { RiskLevel } from "@prisma/client";
import { DEFAULT_VALUE_WEIGHTS, type ValueWeights } from "./weights";

export { DEFAULT_VALUE_WEIGHTS, type ValueWeights } from "./weights";

export interface PositionPoolStats {
  /** Fantasy points of the last "starter-worthy" player at this position (VORP baseline). */
  replacementPoints: number;
  bestPoints: number;
  worstPoints: number;
}

export interface ValueContext {
  projectedPoints: number;
  floor: number;
  ceiling: number;
  overallRank: number;
  adp: number;
  rosterNeed: number; // 0-1
  tierDropoffPoints: number; // points until the next tier down
  riskLevel: RiskLevel;
  byeWeekConflicts: number;
  positionStats: PositionPoolStats;
}

export interface ValueResult {
  overallValue: number;
  positionValue: number;
  draftValue: number;
  riskAdjustedValue: number;
  upsideScore: number;
}

const RISK_PENALTY: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 0.4, HIGH: 1 };

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function clampScore(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
}

/**
 * Computes a player's draft value from projection, positional scarcity,
 * ADP, roster need, tier drop-off, risk, and bye-week conflicts. Weights
 * are swappable via the `weights` argument -- see ./weights.ts.
 */
export function calculateValue(ctx: ValueContext, weights: ValueWeights = DEFAULT_VALUE_WEIGHTS): ValueResult {
  const range = Math.max(1, ctx.positionStats.bestPoints - ctx.positionStats.worstPoints);
  const vorp = ctx.projectedPoints - ctx.positionStats.replacementPoints;
  const vorpNormalized = clamp01(vorp / range + 0.5);

  const adpValueDelta = ctx.adp - ctx.overallRank; // positive = falls past where rank says they should go
  const adpValueNormalized = clamp01(0.5 + adpValueDelta / 40);

  const scarcityNormalized = clamp01(
    (ctx.positionStats.bestPoints - ctx.positionStats.replacementPoints) / Math.max(1, ctx.positionStats.bestPoints)
  );

  const tierDropoffNormalized = clamp01(ctx.tierDropoffPoints / 25);
  const riskPenalty = RISK_PENALTY[ctx.riskLevel];
  const byePenalty = clamp01(ctx.byeWeekConflicts / 3);

  const raw =
    vorpNormalized * weights.projection +
    adpValueNormalized * weights.adpValue +
    scarcityNormalized * weights.scarcity +
    clamp01(ctx.rosterNeed) * weights.need +
    tierDropoffNormalized * weights.tierDropoff +
    riskPenalty * weights.risk +
    byePenalty * weights.byeConflict;

  const maxPossible = weights.projection + weights.adpValue + weights.scarcity + weights.need + weights.tierDropoff;
  const overallValue = clampScore((raw / maxPossible) * 100);

  const positionValue = clampScore(vorpNormalized * 70 + scarcityNormalized * 30);
  const draftValue = clampScore(adpValueNormalized * 100);

  const floorRatio = ctx.projectedPoints > 0 ? ctx.floor / ctx.projectedPoints : 0;
  const riskAdjustedValue = clampScore(overallValue * (0.6 + 0.4 * floorRatio) - riskPenalty * 10);

  const ceilingRatio = ctx.projectedPoints > 0 ? ctx.ceiling / ctx.projectedPoints : 1;
  const upsideScore = clampScore(vorpNormalized * 40 + (ceilingRatio - 1) * 150 + scarcityNormalized * 10);

  return { overallValue, positionValue, draftValue, riskAdjustedValue, upsideScore };
}

/** Builds { replacementPoints, bestPoints, worstPoints } for a position from a sorted-desc points array. */
export function computePositionPoolStats(pointsDesc: number[], starterCount: number): PositionPoolStats {
  if (pointsDesc.length === 0) return { replacementPoints: 0, bestPoints: 0, worstPoints: 0 };
  const replacementIndex = Math.min(pointsDesc.length - 1, Math.max(0, starterCount));
  return {
    bestPoints: pointsDesc[0]!,
    replacementPoints: pointsDesc[replacementIndex]!,
    worstPoints: pointsDesc[pointsDesc.length - 1]!,
  };
}
