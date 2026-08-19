import type { ScoringFormatPreset } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PLAYER_INCLUDE_FOR, shapePlayer } from "./shape";
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

  return POSITIONS.map((position) => ({
    position,
    tiers: tiers
      .filter((t) => t.position === position)
      .map((tier) => ({
        ...tier,
        players: shaped
          .filter((p) => p.playerSeason?.tierId === tier.id)
          .sort((a, b) => (a.ranking?.positionRank ?? 999) - (b.ranking?.positionRank ?? 999)),
      })),
  }));
}
