import type {
  ADP,
  DraftPick,
  NFLTeam,
  Player,
  PlayerSeason,
  Position,
  Projection,
  Ranking,
  RookieProfile,
  ScoringFormatPreset,
  Tier,
} from "@prisma/client";

export type {
  Position,
  ScoringFormatPreset,
  InjuryStatus,
  RiskLevel,
  DraftMode,
  DraftType,
  DraftStatus,
  CPUPersonality,
  StrategyType,
  RankingSource,
} from "@prisma/client";

/** Player + everything needed to render a card/row without extra queries. */
export interface PlayerWithContext extends Player {
  nflTeam: NFLTeam | null;
  rookieProfile: RookieProfile | null;
  playerSeason: (PlayerSeason & { tier: Tier | null }) | null;
  ranking: Ranking | null;
  projection: Projection | null;
  adp: ADP | null;
}

export interface DraftPickWithPlayer extends DraftPick {
  player: PlayerWithContext | null;
}

export const POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K", "DST"];
export const SKILL_POSITIONS: Position[] = ["QB", "RB", "WR", "TE"];

export const SCORING_FORMAT_LABELS: Record<ScoringFormatPreset, string> = {
  STANDARD: "Standard",
  HALF_PPR: "Half PPR",
  PPR: "PPR",
  SUPERFLEX: "Superflex",
  TE_PREMIUM: "TE Premium",
  CUSTOM: "Custom",
};

export const POSITION_LABELS: Record<Position, string> = {
  QB: "Quarterback",
  RB: "Running Back",
  WR: "Wide Receiver",
  TE: "Tight End",
  K: "Kicker",
  DST: "Defense/Special Teams",
};
