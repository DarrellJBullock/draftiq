import type { Position, RankingSource, ScoringFormatPreset } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { calculateDdaflAdjustment, computePositionAverageYPT } from "@/lib/services/scoring/ddafl-adjustment";

/**
 * Full ranking board for a single source (CONSENSUS or EXPERT), with just
 * enough player context (team, ADP, projection) to render a dense table
 * without extra round trips. Not reusing `PLAYER_INCLUDE_FOR` from
 * `shape.ts` because that hardcodes the CONSENSUS ranking relation, which
 * this query needs to vary by `source`.
 */
export async function getRankingsBoard(
  seasonId: string,
  scoringFormat: ScoringFormatPreset,
  source: RankingSource,
  position?: Position
) {
  const rankings = await prisma.ranking.findMany({
    where: {
      seasonId,
      scoringFormat,
      source,
      ...(position ? { player: { position } } : {}),
    },
    include: {
      player: {
        include: {
          nflTeam: true,
          adps: { where: { seasonId, scoringFormat }, take: 1 },
          projections: { where: { seasonId, scoringFormat }, take: 1 },
        },
      },
    },
    orderBy: { overallRank: "asc" },
  });

  const ddaflInputs = rankings.map((r) => ({
    position: r.player.position,
    rushAttempts: r.player.projections[0]?.rushAttempts,
    rushingYards: r.player.projections[0]?.rushingYards,
    receptions: r.player.projections[0]?.receptions,
    receivingYards: r.player.projections[0]?.receivingYards,
    attempts: r.player.projections[0]?.attempts,
    passingYards: r.player.projections[0]?.passingYards,
  }));
  const positionAverageYPTCache = new Map<Position, number | null>();
  for (const pos of new Set(ddaflInputs.map((i) => i.position))) {
    positionAverageYPTCache.set(pos, computePositionAverageYPT(ddaflInputs, pos));
  }

  return rankings.map((r, i) => {
    const { adps, projections, ...player } = r.player;
    return {
      id: r.id,
      overallRank: r.overallRank,
      positionRank: r.positionRank,
      ddaflAdjustment: calculateDdaflAdjustment(ddaflInputs[i]!, positionAverageYPTCache.get(r.player.position) ?? null),
      player: {
        ...player,
        adp: adps[0] ?? null,
        projection: projections[0] ?? null,
      },
    };
  });
}

export type RankingBoardRow = Awaited<ReturnType<typeof getRankingsBoard>>[number];
