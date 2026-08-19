import type { Prisma, ScoringFormatPreset } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { PlayerQuery, RookieQuery } from "@/lib/validation/player";
import { PLAYER_INCLUDE_FOR, shapePlayer } from "./shape";

export async function getPlayerPool(seasonId: string, query: PlayerQuery) {
  const scoringFormat = (query.scoringFormat ?? "PPR") as ScoringFormatPreset;

  const where: Prisma.PlayerWhereInput = {
    playerSeasons: { some: { seasonId } },
    ...(query.position ? { position: query.position } : {}),
    ...(query.team ? { nflTeam: { abbreviation: query.team } } : {}),
    ...(query.rookie !== undefined ? { isRookie: query.rookie } : {}),
    ...(query.freeAgent !== undefined ? { isFreeAgent: query.freeAgent } : {}),
    ...(query.injuryStatus ? { injuryStatus: query.injuryStatus } : {}),
    ...(query.ageMax ? { age: { lte: query.ageMax } } : {}),
    ...(query.veteran ? { isRookie: false, isFreeAgent: false } : {}),
    ...(query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: "insensitive" } },
            { lastName: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(query.byeWeek ? { playerSeasons: { some: { seasonId, byeWeek: query.byeWeek } } } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.player.count({ where }),
    prisma.player.findMany({
      where,
      include: PLAYER_INCLUDE_FOR(seasonId, scoringFormat),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  let players = rows.map(shapePlayer);

  if (query.riskLevel) players = players.filter((p) => p.playerSeason?.riskLevel === query.riskLevel);
  if (query.tier) players = players.filter((p) => p.playerSeason?.tier?.tierNumber === query.tier);
  if (query.adpMin !== undefined) players = players.filter((p) => (p.adp?.overallADP ?? Infinity) >= query.adpMin!);
  if (query.adpMax !== undefined) players = players.filter((p) => (p.adp?.overallADP ?? -Infinity) <= query.adpMax!);
  if (query.rankMax !== undefined) players = players.filter((p) => (p.ranking?.overallRank ?? Infinity) <= query.rankMax!);

  players.sort((a, b) => {
    switch (query.sortBy) {
      case "adp":
        return (a.adp?.overallADP ?? Infinity) - (b.adp?.overallADP ?? Infinity);
      case "fantasyPoints":
        return (b.projection?.fantasyPoints ?? 0) - (a.projection?.fantasyPoints ?? 0);
      case "name":
        return `${a.lastName}`.localeCompare(b.lastName);
      case "overallRank":
      default:
        return (a.ranking?.overallRank ?? Infinity) - (b.ranking?.overallRank ?? Infinity);
    }
  });

  return { players, total, page: query.page, pageSize: query.pageSize };
}

export async function getPlayerDetail(playerId: string, seasonId: string, scoringFormat: ScoringFormatPreset) {
  const raw = await prisma.player.findUnique({
    where: { id: playerId },
    include: PLAYER_INCLUDE_FOR(seasonId, scoringFormat),
  });
  if (!raw) return null;
  return shapePlayer(raw);
}

/** Fetches a set of players by id (e.g. for "comparable players" lookups) preserving no particular order guarantee. */
export async function getPlayersByIds(playerIds: string[], seasonId: string, scoringFormat: ScoringFormatPreset) {
  if (playerIds.length === 0) return [];
  const rows = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    include: PLAYER_INCLUDE_FOR(seasonId, scoringFormat),
  });
  return rows.map(shapePlayer);
}

export async function getRookiePool(seasonId: string, seasonYear: number, query: RookieQuery) {
  const where: Prisma.PlayerWhereInput = {
    isRookie: true,
    rookieProfile: { draftYear: seasonYear },
    ...(query.position ? { position: query.position } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.player.count({ where }),
    prisma.player.findMany({
      where,
      include: PLAYER_INCLUDE_FOR(seasonId, "PPR"),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  let players = rows.map(shapePlayer);
  if (query.tier) players = players.filter((p) => p.rookieProfile?.rookieTier === query.tier);

  players.sort((a, b) => {
    switch (query.sortBy) {
      case "breakoutScore":
        return (b.rookieProfile?.breakoutScore ?? 0) - (a.rookieProfile?.breakoutScore ?? 0);
      case "opportunityScore":
        return (b.rookieProfile?.opportunityScore ?? 0) - (a.rookieProfile?.opportunityScore ?? 0);
      case "adp":
        return (a.adp?.overallADP ?? Infinity) - (b.adp?.overallADP ?? Infinity);
      case "overallFantasyRank":
      default:
        return (a.rookieProfile?.overallFantasyRank ?? Infinity) - (b.rookieProfile?.overallFantasyRank ?? Infinity);
    }
  });

  return { players, total, page: query.page, pageSize: query.pageSize };
}
