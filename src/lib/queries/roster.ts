import type { ScoringFormatPreset } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PLAYER_INCLUDE_FOR, shapePlayer } from "./shape";

/** Finds this user's manually-built roster for a league (draftId: null), creating one if none exists. */
export async function getOrCreateManualRoster(userId: string, leagueId: string) {
  const existing = await prisma.roster.findFirst({ where: { userId, leagueId, draftId: null } });
  if (existing) return existing;
  return prisma.roster.create({ data: { userId, leagueId, name: "My Team" } });
}

/**
 * Loads a roster with each RosterPlayer's `player` shaped the same way
 * PLAYER_INCLUDE_FOR/shapePlayer produce elsewhere (nflTeam + season-scoped
 * playerSeason/ranking/projection/adp), so roster rows render identically to
 * player rows anywhere else in the app.
 */
export async function getRosterWithPlayers(rosterId: string, seasonId: string, scoringFormat: ScoringFormatPreset) {
  const roster = await prisma.roster.findUnique({
    where: { id: rosterId },
    include: {
      players: {
        include: { player: { include: PLAYER_INCLUDE_FOR(seasonId, scoringFormat) } },
        orderBy: { addedAt: "asc" },
      },
    },
  });
  if (!roster) return null;

  return {
    ...roster,
    players: roster.players.map((rp) => ({ ...rp, player: shapePlayer(rp.player) })),
  };
}

export type RosterWithPlayers = NonNullable<Awaited<ReturnType<typeof getRosterWithPlayers>>>;
export type RosterPlayerWithPlayer = RosterWithPlayers["players"][number];

/** Adds a player to a roster slot, or moves them to a new slot if already rostered (unique on rosterId+playerId). */
export async function addPlayerToRoster(rosterId: string, playerId: string, slot: string) {
  return prisma.rosterPlayer.upsert({
    where: { rosterId_playerId: { rosterId, playerId } },
    update: { slot },
    create: { rosterId, playerId, slot },
  });
}

export async function removePlayerFromRoster(rosterId: string, playerId: string) {
  return prisma.rosterPlayer.deleteMany({ where: { rosterId, playerId } });
}
