import type { Position, RiskLevel } from "@prisma/client";

export interface TradeAsset {
  playerId: string;
  position: Position;
  value: number; // overallValue from the value-engine, or a rest-of-season equivalent
  risk: RiskLevel;
}

export interface TradeSideSummary {
  totalValue: number;
  positionBreakdown: Partial<Record<Position, number>>;
}

export interface TradeResult {
  sideA: TradeSideSummary;
  sideB: TradeSideSummary;
  winner: "A" | "B" | "even";
  gradeA: string;
  gradeB: string;
  explanation: string;
}

function summarize(side: TradeAsset[]): TradeSideSummary {
  const positionBreakdown: Partial<Record<Position, number>> = {};
  let totalValue = 0;
  for (const asset of side) {
    totalValue += asset.value;
    positionBreakdown[asset.position] = (positionBreakdown[asset.position] ?? 0) + asset.value;
  }
  return { totalValue: Math.round(totalValue * 10) / 10, positionBreakdown };
}

function gradeForDelta(deltaPct: number): string {
  if (deltaPct >= 20) return "A+";
  if (deltaPct >= 12) return "A";
  if (deltaPct >= 6) return "B+";
  if (deltaPct >= 0) return "B";
  if (deltaPct >= -6) return "C";
  if (deltaPct >= -12) return "D";
  return "F";
}

export function evaluateTrade(sideA: TradeAsset[], sideB: TradeAsset[]): TradeResult {
  const a = summarize(sideA);
  const b = summarize(sideB);
  const totalValue = a.totalValue + b.totalValue || 1;
  const deltaA = ((a.totalValue - b.totalValue) / totalValue) * 100;
  const deltaB = -deltaA;

  const winner: TradeResult["winner"] = Math.abs(deltaA) < 3 ? "even" : deltaA > 0 ? "A" : "B";

  const explanation =
    winner === "even"
      ? "This trade is close to a fair value exchange for both sides."
      : `Side ${winner} receives more total value (${winner === "A" ? a.totalValue : b.totalValue} vs ${
          winner === "A" ? b.totalValue : a.totalValue
        }), giving them the edge in this deal.`;

  return {
    sideA: a,
    sideB: b,
    winner,
    gradeA: gradeForDelta(deltaA),
    gradeB: gradeForDelta(deltaB),
    explanation,
  };
}

/**
 * Seam for future weekly-projection data: today this just scales a season
 * projection down to the games remaining. A future weekly-projections
 * provider can replace this implementation without touching evaluateTrade.
 */
export function getRestOfSeasonProjection(seasonFantasyPoints: number, weeksRemaining: number, totalWeeks = 17): number {
  const fraction = Math.min(1, Math.max(0, weeksRemaining / totalWeeks));
  return Math.round(seasonFantasyPoints * fraction * 10) / 10;
}
