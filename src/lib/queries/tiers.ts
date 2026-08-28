import type { ScoringFormatPreset } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PLAYER_INCLUDE_FOR, shapePlayer } from "./shape";
import { calculateDdaflAdjustment, computePositionAverageYPT } from "@/lib/services/scoring/ddafl-adjustment";
import { POSITIONS } from "@/types";

export async function getTierBoard(seasonId: string, scoringFormat: ScoringFormatPreset) {
  const tiers = await prisma.tier.findMany({
    where: { seasonId, scoringFormat },
    orderBy: [{ position: "asc" }, { tierNumber: "asc" }],
  });

  const players = await prisma.player.findMany({
    where: { playerSeasons: { some: { seasonId, tierId: { in: tiers.map((t) => t.id) } } } },
    include: PLAYER_INCLUDE_FOR(seasonId, scoringFormat),
  });
  const shaped = players.map(shapePlayer);

  const ddaflInputs = shaped.map((p) => ({
    position: p.position,
    rushAttempts: p.projection?.rushAttempts,
    rushingYards: p.projection?.rushingYards,
    receptions: p.projection?.receptions,
    receivingYards: p.projection?.receivingYards,
    attempts: p.projection?.attempts,
    passingYards: p.projection?.passingYards,
  }));
  const positionAverageYPTCache = new Map(POSITIONS.map((pos) => [pos, computePositionAverageYPT(ddaflInputs, pos)]));
  const ddaflByPlayerId = new Map(
    shaped.map((p, i) => [p.id, calculateDdaflAdjustment(ddaflInputs[i]!, positionAverageYPTCache.get(p.position) ?? null)])
  );

  return POSITIONS.map((position) => ({
    position,
    tiers: tiers
      .filter((t) => t.position === position)
      .map((tier) => ({
        ...tier,
        players: shaped
          .filter((p) => p.playerSeason?.tierId === tier.id)
          .sort((a, b) => (a.ranking?.positionRank ?? 999) - (b.ranking?.positionRank ?? 999))
          .map((p) => ({ ...p, ddaflAdjustment: ddaflByPlayerId.get(p.id) ?? 1 })),
      })),
  }));
}
