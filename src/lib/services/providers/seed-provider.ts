import type { ScoringFormatPreset } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type {
  NFLDataProvider,
  ProviderADPRecord,
  ProviderPlayerRecord,
  ProviderProjectionRecord,
  ProviderRankingRecord,
} from "./types";

/**
 * Reads whatever is currently in the database (seed data today, imported
 * CSV/JSON data tomorrow) as if it came from an external API. This is the
 * default provider until a live vendor integration is configured.
 */
export const seedDataProvider: NFLDataProvider = {
  name: "seed",

  async getPlayers(seasonYear: number): Promise<ProviderPlayerRecord[]> {
    const players = await prisma.player.findMany({
      where: { playerSeasons: { some: { season: { year: seasonYear } } } },
      include: { nflTeam: true },
    });
    return players.map((p) => ({
      externalId: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      position: p.position,
      nflTeamAbbreviation: p.nflTeam?.abbreviation ?? null,
      jerseyNumber: p.jerseyNumber,
      college: p.college,
      age: p.age,
      isRookie: p.isRookie,
      isFreeAgent: p.isFreeAgent,
    }));
  },

  async getADP(seasonYear: number, scoringFormat: ScoringFormatPreset): Promise<ProviderADPRecord[]> {
    const rows = await prisma.aDP.findMany({ where: { season: { year: seasonYear }, scoringFormat } });
    return rows.map((r) => ({ externalPlayerId: r.playerId, scoringFormat, overallADP: r.overallADP }));
  },

  async getProjections(seasonYear: number, scoringFormat: ScoringFormatPreset): Promise<ProviderProjectionRecord[]> {
    const rows = await prisma.projection.findMany({ where: { season: { year: seasonYear }, scoringFormat } });
    return rows.map((r) => ({ externalPlayerId: r.playerId, scoringFormat, fantasyPoints: r.fantasyPoints ?? 0 }));
  },

  async getRankings(seasonYear: number, scoringFormat: ScoringFormatPreset): Promise<ProviderRankingRecord[]> {
    const rows = await prisma.ranking.findMany({ where: { season: { year: seasonYear }, scoringFormat, source: "CONSENSUS" } });
    return rows.map((r) => ({ externalPlayerId: r.playerId, scoringFormat, overallRank: r.overallRank, positionRank: r.positionRank }));
  },
};
