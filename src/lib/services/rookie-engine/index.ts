import type { Position } from "@prisma/client";

export interface RookieRawInput {
  position: Position;
  /** Overall NFL draft pick (1-260ish). Lower = more capital. */
  draftPick: number;
  /** 0-1: how open the immediate opportunity is (volume the offense can realistically give a rookie). */
  projectedVolumeShare: number;
  /** 0-1: how uncontested the depth chart is (1 = wide open, 0 = buried behind an entrenched starter). */
  depthChartOpenness: number;
  /** 0-1: quality of the offensive environment (scheme fit, QB play, O-line, pace). */
  offenseQualityScore: number;
  projectedFantasyPoints: number;
  floorPoints: number;
  ceilingPoints: number;
}

export interface RookieScores {
  draftCapitalScore: number;
  opportunityScore: number;
  teamSituationScore: number;
  competitionScore: number;
  landingSpotScore: number;
  breakoutScore: number;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function to100(n: number): number {
  return Math.round(clamp01(n) * 1000) / 10;
}

/**
 * The rookie-specific value model: separates draft capital, the immediate
 * opportunity, offensive environment, and positional competition, then
 * combines them into a single breakout score used to rank the class.
 */
export function computeRookieScores(input: RookieRawInput): RookieScores {
  const draftCapitalScore = to100(1 - Math.min(260, input.draftPick) / 260);
  const opportunityScore = to100(input.projectedVolumeShare * 0.6 + input.depthChartOpenness * 0.4);
  const teamSituationScore = to100(input.offenseQualityScore * 0.7 + draftCapitalScore / 100 * 0.3);
  const competitionScore = to100(1 - input.depthChartOpenness);
  const landingSpotScore = to100(input.offenseQualityScore * 0.5 + input.depthChartOpenness * 0.3 + draftCapitalScore / 100 * 0.2);

  const ceilingUpside = input.projectedFantasyPoints > 0 ? input.ceilingPoints / input.projectedFantasyPoints - 1 : 0;
  const breakoutScore = to100(
    opportunityScore / 100 * 0.35 +
      landingSpotScore / 100 * 0.25 +
      draftCapitalScore / 100 * 0.2 +
      clamp01(ceilingUpside) * 0.2
  );

  return { draftCapitalScore, opportunityScore, teamSituationScore, competitionScore, landingSpotScore, breakoutScore };
}

export interface RankableRookie {
  id: string;
  position: Position;
  projectedFantasyPoints: number;
  breakoutScore: number;
  landingSpotScore: number;
}

export interface RookieRankResult {
  id: string;
  positionRank: number;
  overallFantasyRank: number;
  rookieTier: number;
}

/** Ranks a rookie class within position, and overall, from computed scores. */
export function rankRookieClass(rookies: RankableRookie[]): RookieRankResult[] {
  const results = new Map<string, RookieRankResult>();

  const byPosition = new Map<Position, RankableRookie[]>();
  for (const r of rookies) {
    const arr = byPosition.get(r.position) ?? [];
    arr.push(r);
    byPosition.set(r.position, arr);
  }

  for (const [, group] of byPosition) {
    const sorted = [...group].sort((a, b) => b.projectedFantasyPoints - a.projectedFantasyPoints);
    const bucketSize = Math.max(1, Math.ceil(sorted.length / 4));
    sorted.forEach((r, idx) => {
      results.set(r.id, {
        id: r.id,
        positionRank: idx + 1,
        overallFantasyRank: 0,
        rookieTier: Math.min(4, Math.floor(idx / bucketSize) + 1),
      });
    });
  }

  const overallSorted = [...rookies].sort(
    (a, b) => b.breakoutScore + b.landingSpotScore - (a.breakoutScore + a.landingSpotScore) || b.projectedFantasyPoints - a.projectedFantasyPoints
  );
  overallSorted.forEach((r, idx) => {
    const existing = results.get(r.id)!;
    results.set(r.id, { ...existing, overallFantasyRank: idx + 1 });
  });

  return [...results.values()];
}
