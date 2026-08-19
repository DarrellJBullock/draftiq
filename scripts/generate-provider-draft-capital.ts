/**
 * Fills in real draft round/pick for real rookies, sourced from ESPN's
 * public (unauthenticated) sports.core.api.espn.com draft data -- a real,
 * verifiable source, unlike the earlier estimated rookie-profile scores.
 *
 * Two calls' worth of shape:
 *   GET .../seasons/{year}/draft/rounds  -> all 7 rounds, each round's
 *     `picks` array embedded inline with {round, pick, overall, athlete: $ref}
 *   GET each pick's athlete $ref -> {firstName, lastName, position}
 *
 * Matches drafted athletes onto our already-synced real players by
 * firstName+lastName+position (case-insensitive), the same matching the
 * CSV importer already uses -- so this only touches players that exist.
 * Only draftRound/draftPick(overall) are set; every other RookieProfile
 * field (opportunity/competition/etc. from generate-provider-rookie-
 * profiles.ts) is left untouched, since Prisma skips undefined fields on
 * update.
 *
 * Usage: npx tsx scripts/generate-provider-draft-capital.ts [draftYear]
 */
import { parseImportFile } from "../src/lib/services/import/parser";
import { validateImportRows } from "../src/lib/services/import/validator";
import { importRows } from "../src/lib/services/import/importer";

const DRAFT_YEAR = Number(process.argv[2]) || 2026;
const BASE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";
const HEADERS = { "User-Agent": "DraftIQ (https://github.com/DarrellJBullock/draftiq)" };

interface EspnRef {
  $ref: string;
}
interface EspnPick {
  round: number;
  pick: number;
  overall: number;
  athlete: EspnRef;
}
interface EspnRound {
  number: number;
  picks: EspnPick[];
}
interface EspnRoundsResponse {
  items: EspnRound[];
}
interface EspnAthlete {
  firstName: string;
  lastName: string;
  position?: { abbreviation: string };
}

// ESPN's draft-athlete position abbreviations match ours except for
// place-kickers, which ESPN sometimes labels "PK".
const POSITION_MAP: Record<string, string> = { QB: "QB", RB: "RB", WR: "WR", TE: "TE", K: "K", PK: "K" };

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json() as Promise<T>;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function main() {
  console.log(`Fetching the ${DRAFT_YEAR} NFL Draft board from ESPN...`);
  const rounds = await fetchJson<EspnRoundsResponse>(`${BASE}/seasons/${DRAFT_YEAR}/draft/rounds?limit=100`);
  const picks = rounds.items.flatMap((r) => r.picks);
  console.log(`Found ${picks.length} real draft picks across ${rounds.items.length} rounds.`);

  console.log("Resolving each pick's real player name (this takes a minute)...");
  const resolved = await mapWithConcurrency(picks, 15, async (pick) => {
    try {
      const athlete = await fetchJson<EspnAthlete>(pick.athlete.$ref.replace(/\?.*$/, ""));
      const position = athlete.position?.abbreviation ? POSITION_MAP[athlete.position.abbreviation] : undefined;
      if (!position) return null;
      return { firstName: athlete.firstName, lastName: athlete.lastName, position, draftRound: pick.round, draftPick: pick.overall };
    } catch (err) {
      console.warn(`Failed to resolve pick ${pick.overall}: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  });

  const rows = resolved.filter((r): r is NonNullable<typeof r> => r !== null);
  console.log(`Resolved ${rows.length} of ${picks.length} picks to a name + position.`);

  const csvEscape = (v: string) => (v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [
    "firstName,lastName,position,nflTeamAbbreviation,college,age,draftRound,draftPick,rookieTier,fantasyPositionRank,overallFantasyRank,projectedFantasyPoints,floor,median,ceiling,opportunityScore,competitionScore,landingSpotScore,breakoutScore,analystNotes",
    ...rows.map((r) => [csvEscape(r.firstName), csvEscape(r.lastName), r.position, "", "", "", r.draftRound, r.draftPick, "", "", "", "", "", "", "", "", "", "", "", ""].join(",")),
  ].join("\n");

  console.log("Importing draft capital via the app's CSV import pipeline...");
  const validation = validateImportRows("rookies", parseImportFile(csv, "rookies.csv").rows);
  const outcome = await importRows("rookies", DRAFT_YEAR, validation.validRows as never);
  console.log(`Draft capital: ${outcome.imported} matched to an existing real player, ${outcome.skipped.length} skipped (no matching player in our DB), ${validation.errorCount} validation errors.`);
  if (outcome.skipped.length > 0) {
    console.log("First 15 unmatched picks (likely not in our synced player pool, e.g. non-fantasy-relevant positions):");
    console.log(outcome.skipped.slice(0, 15));
  }
  if (validation.errorCount > 0) console.log(validation.issues.slice(0, 10));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
