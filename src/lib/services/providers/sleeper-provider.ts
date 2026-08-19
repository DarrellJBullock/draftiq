import type { InjuryStatus, ScoringFormatPreset } from "@prisma/client";
import type {
  NFLDataProvider,
  ProviderADPRecord,
  ProviderPlayerRecord,
  ProviderProjectionRecord,
  ProviderRankingRecord,
} from "./types";

const SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl";

// Sleeper's real-time roster feed is not versioned by season -- fetch it
// once per process and reuse it for the lifetime of the server instance
// rather than re-downloading ~14MB on every call.
let cache: { fetchedAt: number; players: ProviderPlayerRecord[] } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

export interface SleeperPlayer {
  player_id: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  team: string | null;
  number: number | null;
  college: string | null;
  age: number | null;
  years_exp: number | null;
  active: boolean;
  status: string | null;
  injury_status: string | null;
  sport: string;
}

// DEF entries use "DEF"; every other position we track matches our own enum already.
const POSITION_MAP: Record<string, string> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  K: "K",
  DEF: "DST",
};

// Sleeper's designations mapped onto our InjuryStatus enum; anything absent
// or unrecognized (NA, DNR, COV, null) is left unmapped -- sync only
// overwrites injuryStatus when the provider actually reported one.
const INJURY_STATUS_MAP: Record<string, InjuryStatus> = {
  Questionable: "QUESTIONABLE",
  Doubtful: "DOUBTFUL",
  Out: "OUT",
  IR: "IR",
  PUP: "PUP",
  Sus: "SUSPENDED",
};

export function mapSleeperPlayer(p: SleeperPlayer): ProviderPlayerRecord | null {
  const position = p.position ? POSITION_MAP[p.position] : undefined;
  if (!position) return null;

  const injuryStatus = p.injury_status ? INJURY_STATUS_MAP[p.injury_status] : undefined;

  return {
    externalId: p.player_id,
    firstName: p.first_name?.trim() || "Unknown",
    lastName: p.last_name?.trim() || "Player",
    position,
    nflTeamAbbreviation: p.team,
    jerseyNumber: p.number,
    college: p.college,
    age: p.age,
    isRookie: p.years_exp === 0,
    isFreeAgent: !p.team,
    ...(injuryStatus ? { injuryStatus } : {}),
  };
}

async function fetchPlayers(): Promise<ProviderPlayerRecord[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.players;

  const res = await fetch(SLEEPER_PLAYERS_URL, {
    // Sleeper has no auth or rate-limit key; a descriptive UA is good citizenship.
    headers: { "User-Agent": "DraftIQ (https://github.com/DarrellJBullock/draftiq)" },
    next: { revalidate: 60 * 60 * 6 },
  });
  if (!res.ok) throw new Error(`Sleeper API returned ${res.status} ${res.statusText}`);

  const raw = (await res.json()) as Record<string, SleeperPlayer>;
  const players = Object.values(raw)
    // Team defense (DEF) entries don't carry a `status` field at all -- only
    // individual players do -- so requiring status === "Active" for everyone
    // silently excluded all 32 real team defenses from ever syncing.
    .filter((p) => p.sport === "nfl" && p.active && p.team && (p.position === "DEF" || p.status === "Active"))
    .map(mapSleeperPlayer)
    .filter((p): p is ProviderPlayerRecord => p !== null);

  cache = { fetchedAt: Date.now(), players };
  return players;
}

/**
 * Real, live NFL player data from Sleeper's public API (api.sleeper.app) --
 * free, no API key required. Covers player bios/rosters/status only; Sleeper
 * doesn't expose ADP, projections, or expert rankings (those are proprietary
 * commercial products elsewhere), so those three methods intentionally return
 * an empty array rather than inventing numbers. Sleeper also isn't
 * season-versioned -- `seasonYear` is accepted for interface compatibility
 * but every call reflects Sleeper's current real-time roster state.
 */
export const sleeperProvider: NFLDataProvider = {
  name: "sleeper",

  async getPlayers(_seasonYear: number): Promise<ProviderPlayerRecord[]> {
    void _seasonYear;
    return fetchPlayers();
  },

  async getADP(_seasonYear: number, _scoringFormat: ScoringFormatPreset): Promise<ProviderADPRecord[]> {
    void _seasonYear;
    void _scoringFormat;
    return [];
  },

  async getProjections(_seasonYear: number, _scoringFormat: ScoringFormatPreset): Promise<ProviderProjectionRecord[]> {
    void _seasonYear;
    void _scoringFormat;
    return [];
  },

  async getRankings(_seasonYear: number, _scoringFormat: ScoringFormatPreset): Promise<ProviderRankingRecord[]> {
    void _seasonYear;
    void _scoringFormat;
    return [];
  },
};
