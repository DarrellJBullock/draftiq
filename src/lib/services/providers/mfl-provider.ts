import type { Position } from "@prisma/client";

/**
 * MyFantasyLeague's public export API (api.myfantasyleague.com / {host}.myfantasyleague.com).
 * No API key needed for a public league. Shapes below are verified against a
 * real completed draft (37681, 2025 season), not guessed from docs alone.
 */

export interface MflDraftPick {
  round: string;
  pick: string;
  franchise: string;
  player: string;
  timestamp: string;
  comments?: string;
}

export interface MflDraftUnit {
  unit: string; // e.g. "CONFERENCE00"
  draftType: string;
  static_url: string;
  round1DraftOrder: string; // comma-separated franchise ids, trailing comma
  draftPick?: MflDraftPick | MflDraftPick[];
}

export interface MflConference {
  id: string;
  name: string;
}

// MFL sometimes returns a bare object instead of a 1-element array when
// there's only one of something -- normalize every list field defensively.
function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export async function fetchMflDraftUnits(host: string, leagueId: string, seasonYear: number): Promise<MflDraftUnit[]> {
  const url = `https://${host}.myfantasyleague.com/${seasonYear}/export?TYPE=draftResults&L=${encodeURIComponent(leagueId)}&JSON=1`;
  const res = await fetch(url, { headers: { "User-Agent": "DraftIQ (https://github.com/DarrellJBullock/draftiq)" } });
  if (!res.ok) throw new Error(`MyFantasyLeague returned ${res.status} ${res.statusText}`);
  const raw = (await res.json()) as { error?: { $t: string }; draftResults?: { draftUnit?: MflDraftUnit | MflDraftUnit[] } };
  if (raw.error) throw new Error(`MyFantasyLeague error: ${raw.error.$t}`);
  return asArray(raw.draftResults?.draftUnit);
}

export async function fetchMflConferences(host: string, leagueId: string, seasonYear: number): Promise<MflConference[]> {
  const url = `https://${host}.myfantasyleague.com/${seasonYear}/export?TYPE=league&L=${encodeURIComponent(leagueId)}&JSON=1`;
  const res = await fetch(url, { headers: { "User-Agent": "DraftIQ (https://github.com/DarrellJBullock/draftiq)" } });
  if (!res.ok) throw new Error(`MyFantasyLeague returned ${res.status} ${res.statusText}`);
  const raw = (await res.json()) as { error?: { $t: string }; league?: { conferences?: { conference?: MflConference | MflConference[] } } };
  if (raw.error) throw new Error(`MyFantasyLeague error: ${raw.error.$t}`);
  return asArray(raw.league?.conferences?.conference);
}

export interface MflPlayerInfo {
  firstName: string;
  lastName: string;
  position: Position | null;
}

interface MflPlayerRaw {
  id: string;
  name: string; // "Last, First" for people, "Team Name, City" for defenses
  position: string;
}

// MFL's position codes; PK/Def don't match our enum names directly.
const MFL_POSITION_MAP: Record<string, Position> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  PK: "K",
  Def: "DST",
};

function parseMflName(name: string): { firstName: string; lastName: string } {
  const [last, first] = name.split(",").map((s) => s.trim());
  return { firstName: first ?? last, lastName: first ? last : "" };
}

/** api.myfantasyleague.com (not the league's www## host) is required for the players export. */
export async function fetchMflPlayerIndex(seasonYear: number, playerIds: string[]): Promise<Map<string, MflPlayerInfo>> {
  const result = new Map<string, MflPlayerInfo>();
  const uniqueIds = Array.from(new Set(playerIds));
  const BATCH_SIZE = 200;

  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + BATCH_SIZE);
    const url = `https://api.myfantasyleague.com/${seasonYear}/export?TYPE=players&JSON=1&PLAYERS=${batch.join(",")}`;
    const res = await fetch(url, { headers: { "User-Agent": "DraftIQ (https://github.com/DarrellJBullock/draftiq)" } });
    if (!res.ok) throw new Error(`MyFantasyLeague returned ${res.status} ${res.statusText}`);
    const raw = (await res.json()) as { error?: { $t: string }; players?: { player?: MflPlayerRaw | MflPlayerRaw[] } };
    if (raw.error) throw new Error(`MyFantasyLeague error: ${raw.error.$t}`);
    for (const p of asArray(raw.players?.player)) {
      const { firstName, lastName } = parseMflName(p.name);
      result.set(p.id, { firstName, lastName, position: MFL_POSITION_MAP[p.position] ?? null });
    }
  }

  return result;
}

/** Round-1 pick order gives franchise id -> teamSlot (1-indexed), matching our own snake-order convention. */
export function parseFranchiseOrder(round1DraftOrder: string): string[] {
  return round1DraftOrder
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
