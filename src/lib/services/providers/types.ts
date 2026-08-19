import type { ScoringFormatPreset } from "@prisma/client";

export interface ProviderPlayerRecord {
  externalId: string;
  firstName: string;
  lastName: string;
  position: string;
  nflTeamAbbreviation: string | null;
  jerseyNumber: number | null;
  college: string | null;
  age: number | null;
  isRookie: boolean;
  isFreeAgent: boolean;
}

export interface ProviderADPRecord {
  externalPlayerId: string;
  scoringFormat: ScoringFormatPreset;
  overallADP: number;
}

export interface ProviderProjectionRecord {
  externalPlayerId: string;
  scoringFormat: ScoringFormatPreset;
  fantasyPoints: number;
}

export interface ProviderRankingRecord {
  externalPlayerId: string;
  scoringFormat: ScoringFormatPreset;
  overallRank: number;
  positionRank: number;
}

/**
 * Contract any external fantasy/NFL data source (SportsData.io, an ADP
 * aggregator, etc.) must satisfy to plug into DraftIQ. Implement this
 * interface and swap the export in `./index.ts` -- no other app code needs
 * to change.
 */
export interface NFLDataProvider {
  readonly name: string;
  getPlayers(seasonYear: number): Promise<ProviderPlayerRecord[]>;
  getADP(seasonYear: number, scoringFormat: ScoringFormatPreset): Promise<ProviderADPRecord[]>;
  getProjections(seasonYear: number, scoringFormat: ScoringFormatPreset): Promise<ProviderProjectionRecord[]>;
  getRankings(seasonYear: number, scoringFormat: ScoringFormatPreset): Promise<ProviderRankingRecord[]>;
}
