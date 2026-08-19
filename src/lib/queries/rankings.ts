import type { Position, RankingSource, ScoringFormatPreset } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

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

  return rankings.map((r) => {
    const { adps, projections, ...player } = r.player;
    return {
      id: r.id,
      overallRank: r.overallRank,
      positionRank: r.positionRank,
      player: {
        ...player,
        adp: adps[0] ?? null,
        projection: projections[0] ?? null,
      },
    };
  });
}

export type RankingBoardRow = Awaited<ReturnType<typeof getRankingsBoard>>[number];
