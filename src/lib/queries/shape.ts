import type { ADP, NFLTeam, Player, PlayerSeason, Projection, Ranking, RookieProfile, Tier } from "@prisma/client";
import type { PlayerWithContext } from "@/types";

type RawPlayer = Player & {
  nflTeam: NFLTeam | null;
  rookieProfile: RookieProfile | null;
  playerSeasons: (PlayerSeason & { tier: Tier | null })[];
  rankings: Ranking[];
  projections: Projection[];
  adps: ADP[];
};

/** Flattens the season/format-filtered relations Prisma returns as arrays into single objects. */
export function shapePlayer(raw: RawPlayer): PlayerWithContext {
  return {
    ...raw,
    playerSeason: raw.playerSeasons[0] ?? null,
    ranking: raw.rankings[0] ?? null,
    projection: raw.projections[0] ?? null,
    adp: raw.adps[0] ?? null,
  };
}

export const PLAYER_INCLUDE_FOR = (seasonId: string, scoringFormat: string) => ({
  nflTeam: true,
  rookieProfile: true,
  playerSeasons: { where: { seasonId }, include: { tier: true }, take: 1 },
  rankings: { where: { seasonId, scoringFormat: scoringFormat as never, source: "CONSENSUS" as const }, take: 1 },
  projections: { where: { seasonId, scoringFormat: scoringFormat as never }, take: 1 },
  adps: { where: { seasonId, scoringFormat: scoringFormat as never }, take: 1 },
});
