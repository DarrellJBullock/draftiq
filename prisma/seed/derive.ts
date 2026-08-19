import type { Position, ScoringFormatPreset } from "@prisma/client";
import type { StatLine } from "./statlines";
import { fantasyPointsFor } from "./statlines";
import { randFloat } from "./rng";

export const SEED_FORMATS: ScoringFormatPreset[] = ["STANDARD", "HALF_PPR", "PPR"];

const TIER_BUCKET_SIZE: Record<Position, number> = {
  QB: 4,
  RB: 5,
  WR: 6,
  TE: 4,
  K: 6,
  DST: 6,
};

// Roughly "startable across a 12-team league" rank per position, used as the
// replacement-level baseline for cross-position (overall) ranking/ADP. QBs
// score the most raw fantasy points of any position but are one-per-team in
// most formats, so ranking/ADP purely by raw points would (incorrectly) send
// QBs off the board in round 1 -- real drafts and rankings correct for this
// with a value-over-replacement adjustment, which is what this baseline is for.
const REPLACEMENT_RANK: Record<Position, number> = {
  QB: 14,
  RB: 34,
  WR: 40,
  TE: 14,
  K: 12,
  DST: 12,
};

export interface DerivedPlayerInput {
  id: string;
  position: Position;
  stat: StatLine;
}

export interface RankingRow {
  playerId: string;
  source: "CONSENSUS" | "EXPERT";
  scoringFormat: ScoringFormatPreset;
  overallRank: number;
  positionRank: number;
}

export interface ProjectionRow {
  playerId: string;
  scoringFormat: ScoringFormatPreset;
  stat: StatLine;
  fantasyPoints: number;
  floor: number;
  median: number;
  ceiling: number;
}

export interface ADPRow {
  playerId: string;
  scoringFormat: ScoringFormatPreset;
  overallADP: number;
  positionADP: number;
  previousADP: number;
  adpDelta: number;
}

export interface TierKey {
  position: Position;
  scoringFormat: ScoringFormatPreset;
  tierNumber: number;
}

export interface TierAssignment {
  playerId: string;
  scoringFormat: ScoringFormatPreset;
  tierKey: TierKey;
}

export interface DerivedSeedData {
  rankings: RankingRow[];
  projections: ProjectionRow[];
  adps: ADPRow[];
  tierKeys: TierKey[];
  tierAssignments: TierAssignment[];
}

function floorCeilingFor(median: number, position: Position): { floor: number; ceiling: number } {
  const spread: Record<Position, [number, number]> = {
    QB: [0.78, 1.28],
    RB: [0.62, 1.42],
    WR: [0.6, 1.45],
    TE: [0.58, 1.5],
    K: [0.75, 1.25],
    DST: [0.65, 1.4],
  };
  const [lo, hi] = spread[position];
  return { floor: Math.round(median * lo * 10) / 10, ceiling: Math.round(median * hi * 10) / 10 };
}

const TIER_LABELS = ["Elite", "Strong Starter", "Solid Starter", "Flex Contributor", "Depth", "Streamer", "Deep League", "Speculative"];

export function tierLabel(tierNumber: number): string {
  return TIER_LABELS[Math.min(tierNumber, TIER_LABELS.length) - 1] ?? "Deep League";
}

export function deriveSeedData(rand: () => number, players: DerivedPlayerInput[]): DerivedSeedData {
  const rankings: RankingRow[] = [];
  const projections: ProjectionRow[] = [];
  const adps: ADPRow[] = [];
  const tierKeySet = new Map<string, TierKey>();
  const tierAssignments: TierAssignment[] = [];

  for (const format of SEED_FORMATS) {
    const withPoints = players.map((p) => ({
      ...p,
      points: fantasyPointsFor(p.stat, format, p.position),
    }));

    const byPosition = new Map<Position, typeof withPoints>();
    for (const p of withPoints) {
      const arr = byPosition.get(p.position) ?? [];
      arr.push(p);
      byPosition.set(p.position, arr);
    }

    // Replacement-level points per position, for value-over-replacement.
    const replacementPointsByPosition = new Map<Position, number>();
    for (const [position, group] of byPosition) {
      const sorted = [...group].sort((a, b) => b.points - a.points);
      const idx = Math.min(sorted.length - 1, Math.max(0, REPLACEMENT_RANK[position] - 1));
      replacementPointsByPosition.set(position, sorted[idx]?.points ?? 0);
    }

    // Overall rank across the whole seeded pool, by value over replacement
    // (not raw points) so positional scarcity drives the cross-position order.
    const overallSorted = [...withPoints].sort((a, b) => {
      const aVal = a.points - (replacementPointsByPosition.get(a.position) ?? 0);
      const bVal = b.points - (replacementPointsByPosition.get(b.position) ?? 0);
      return bVal - aVal;
    });
    const overallRankOf = new Map<string, number>();
    overallSorted.forEach((p, idx) => overallRankOf.set(p.id, idx + 1));

    for (const [position, group] of byPosition) {
      const sorted = [...group].sort((a, b) => b.points - a.points);
      const bucketSize = TIER_BUCKET_SIZE[position];

      sorted.forEach((p, idx) => {
        const positionRank = idx + 1;
        const overallRank = overallRankOf.get(p.id)!;
        const { floor, ceiling } = floorCeilingFor(p.points, position);

        rankings.push({ playerId: p.id, source: "CONSENSUS", scoringFormat: format, overallRank, positionRank });
        // Expert rankings deviate slightly from consensus for the ADP-vs-expert comparison view.
        const expertJitter = Math.round(randFloat(rand, -3, 3));
        rankings.push({
          playerId: p.id,
          source: "EXPERT",
          scoringFormat: format,
          overallRank: Math.max(1, overallRank + expertJitter),
          positionRank: Math.max(1, positionRank + Math.round(expertJitter / 2)),
        });

        projections.push({ playerId: p.id, scoringFormat: format, stat: p.stat, fantasyPoints: p.points, floor, median: p.points, ceiling });

        const overallADP = Math.max(1, Math.round((overallRank + randFloat(rand, -2.5, 4)) * 10) / 10);
        const adpDelta = Math.round(randFloat(rand, -8, 8) * 10) / 10;
        adps.push({
          playerId: p.id,
          scoringFormat: format,
          overallADP,
          positionADP: positionRank,
          previousADP: Math.max(1, Math.round((overallADP - adpDelta) * 10) / 10),
          adpDelta,
        });

        const tierNumber = Math.min(8, Math.floor(idx / bucketSize) + 1);
        const tierKey: TierKey = { position, scoringFormat: format, tierNumber };
        const keyStr = `${position}|${format}|${tierNumber}`;
        if (!tierKeySet.has(keyStr)) tierKeySet.set(keyStr, tierKey);
        tierAssignments.push({ playerId: p.id, scoringFormat: format, tierKey });
      });
    }
  }

  return { rankings, projections, adps, tierKeys: [...tierKeySet.values()], tierAssignments };
}
