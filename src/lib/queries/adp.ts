import type { ScoringFormatPreset } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PLAYER_INCLUDE_FOR, shapePlayer } from "./shape";

export async function getADPBoard(seasonId: string, scoringFormat: ScoringFormatPreset, limit = 300) {
  const players = await prisma.player.findMany({
    where: { playerSeasons: { some: { seasonId } }, adps: { some: { seasonId, scoringFormat } } },
    include: {
      ...PLAYER_INCLUDE_FOR(seasonId, scoringFormat),
      rankings: { where: { seasonId, scoringFormat, source: { in: ["CONSENSUS", "EXPERT"] } } },
    },
    take: limit,
  });

  return players
    .map((raw) => {
      const shaped = shapePlayer(raw);
      const expert = raw.rankings.find((r) => r.source === "EXPERT") ?? null;
      const consensus = raw.rankings.find((r) => r.source === "CONSENSUS") ?? null;
      return { ...shaped, expertRanking: expert, consensusRanking: consensus };
    })
    .sort((a, b) => (a.adp?.overallADP ?? Infinity) - (b.adp?.overallADP ?? Infinity));
}

export async function getBiggestADPMovers(seasonId: string, scoringFormat: ScoringFormatPreset, limit = 10) {
  const board = await getADPBoard(seasonId, scoringFormat);
  const withDelta = board.filter((p) => p.adp?.adpDelta !== undefined && p.adp?.adpDelta !== null);
  const risers = [...withDelta].sort((a, b) => (a.adp!.adpDelta ?? 0) - (b.adp!.adpDelta ?? 0)).slice(0, limit);
  const fallers = [...withDelta].sort((a, b) => (b.adp!.adpDelta ?? 0) - (a.adp!.adpDelta ?? 0)).slice(0, limit);
  return { risers, fallers };
}
