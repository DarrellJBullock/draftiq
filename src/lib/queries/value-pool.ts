import type { Position, ScoringFormatPreset } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { calculateValue, computePositionPoolStats, type ValueResult } from "@/lib/services/value-engine";
import { deriveRiskLevel } from "@/lib/services/risk";
import { PLAYER_INCLUDE_FOR, shapePlayer } from "./shape";
import type { PlayerWithContext } from "@/types";

export interface ValuedPlayer extends PlayerWithContext {
  value: ValueResult;
}

const DEFAULT_STARTER_COUNTS: Record<Position, number> = { QB: 12, RB: 30, WR: 30, TE: 12, K: 12, DST: 12 };

export interface ValuePoolOptions {
  rosterNeeds?: Partial<Record<Position, number>>;
  byeWeekCounts?: Record<number, number>;
  starterCounts?: Partial<Record<Position, number>>;
}

/** Fetches the full player pool for a season/format and attaches computed value-engine scores. */
export async function getValuedPlayerPool(
  seasonId: string,
  scoringFormat: ScoringFormatPreset,
  options: ValuePoolOptions = {}
): Promise<ValuedPlayer[]> {
  const raw = await prisma.player.findMany({
    include: PLAYER_INCLUDE_FOR(seasonId, scoringFormat),
    where: { playerSeasons: { some: { seasonId } } },
  });

  const players = raw.map(shapePlayer);

  const byPosition = new Map<Position, PlayerWithContext[]>();
  for (const p of players) {
    const arr = byPosition.get(p.position) ?? [];
    arr.push(p);
    byPosition.set(p.position, arr);
  }

  const positionStatsCache = new Map<Position, ReturnType<typeof computePositionPoolStats>>();
  const tierDropoffCache = new Map<string, number>();

  for (const [position, group] of byPosition) {
    const sorted = [...group].sort((a, b) => (b.projection?.fantasyPoints ?? 0) - (a.projection?.fantasyPoints ?? 0));
    const points = sorted.map((p) => p.projection?.fantasyPoints ?? 0);
    const starterCount = options.starterCounts?.[position] ?? DEFAULT_STARTER_COUNTS[position];
    positionStatsCache.set(position, computePositionPoolStats(points, starterCount));

    sorted.forEach((p, idx) => {
      const gapTo = Math.min(sorted.length - 1, idx + 5);
      const dropoff = Math.max(0, points[idx]! - points[gapTo]!);
      tierDropoffCache.set(p.id, dropoff);
    });
  }

  return players.map((p) => {
    const positionStats = positionStatsCache.get(p.position)!;
    const riskLevel = p.playerSeason?.riskLevel ?? deriveRiskLevel({ injuryStatus: p.injuryStatus, isRookie: p.isRookie, age: p.age });
    const byeWeek = p.playerSeason?.byeWeek ?? null;
    const byeWeekConflicts = byeWeek ? Math.max(0, (options.byeWeekCounts?.[byeWeek] ?? 0)) : 0;

    const value = calculateValue({
      projectedPoints: p.projection?.fantasyPoints ?? 0,
      floor: p.projection?.floor ?? 0,
      ceiling: p.projection?.ceiling ?? p.projection?.fantasyPoints ?? 0,
      overallRank: p.ranking?.overallRank ?? 999,
      adp: p.adp?.overallADP ?? 999,
      rosterNeed: options.rosterNeeds?.[p.position] ?? 0.5,
      tierDropoffPoints: tierDropoffCache.get(p.id) ?? 0,
      riskLevel,
      byeWeekConflicts,
      positionStats,
    });

    return { ...p, value };
  });
}
