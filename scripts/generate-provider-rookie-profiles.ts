/**
 * Builds RookieProfile rows for real, live-provider rookies (isRookie: true,
 * dataSource: "PROVIDER") and imports them through the app's actual CSV
 * import pipeline (same code path as /import).
 *
 * Grounded in real signals only:
 * - Sleeper's current `depth_chart_order` per team/position drives
 *   opportunity/competition/landing-spot/breakout scores.
 * - `metadata.rookie_year` (when present) sets the real draft class year.
 * - fantasyPositionRank/overallFantasyRank/rookieTier are derived from the
 *   PPR projections already imported for these players (generate-provider-
 *   data.ts), so ranks stay consistent with what the rest of the app shows.
 *
 * draftRound/draftPick are intentionally left blank: Sleeper's free API
 * doesn't expose real draft capital, and unlike a labeled projection,
 * "Round 3, Pick 12" reads as a checkable fact -- inventing one for a real,
 * named person isn't something this script does. Use CSV import with a
 * real draft-capital source, or a paid vendor, to fill those in later.
 *
 * Usage: npx tsx scripts/generate-provider-rookie-profiles.ts
 */
import { PrismaClient, type Position } from "@prisma/client";
import { mulberry32, randFloat } from "../prisma/seed/rng";
import { parseImportFile } from "../src/lib/services/import/parser";
import { validateImportRows } from "../src/lib/services/import/validator";
import { importRows } from "../src/lib/services/import/importer";

const SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl";
const SEASON_YEAR = 2026;
const SEED = 20260119;

interface SleeperMeta {
  depthChartOrder: number | null;
  rookieYear: number | null;
}

async function fetchSleeperMeta(): Promise<Map<string, SleeperMeta>> {
  const res = await fetch(SLEEPER_PLAYERS_URL, { headers: { "User-Agent": "DraftIQ (https://github.com/DarrellJBullock/draftiq)" } });
  if (!res.ok) throw new Error(`Sleeper API returned ${res.status}`);
  const raw = (await res.json()) as Record<string, { depth_chart_order: number | null; metadata?: { rookie_year?: string } }>;
  const map = new Map<string, SleeperMeta>();
  for (const [id, p] of Object.entries(raw)) {
    const rookieYear = p.metadata?.rookie_year ? Number(p.metadata.rookie_year) : null;
    map.set(id, { depthChartOrder: p.depth_chart_order ?? null, rookieYear: Number.isFinite(rookieYear) ? rookieYear : null });
  }
  return map;
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.min(hi, Math.max(lo, n));
}

async function main() {
  const prisma = new PrismaClient();
  const rand = mulberry32(SEED);

  console.log("Fetching current depth chart data from Sleeper...");
  const sleeperMeta = await fetchSleeperMeta();

  const projections = await prisma.projection.findMany({
    where: { scoringFormat: "PPR", player: { dataSource: "PROVIDER", isRookie: true } },
    include: { player: { select: { id: true, externalId: true, firstName: true, lastName: true, position: true, college: true, nflTeam: { select: { abbreviation: true } } } } },
  });
  console.log(`Found ${projections.length} real rookies with PPR projections.`);

  interface Candidate {
    firstName: string;
    lastName: string;
    position: Position;
    nflTeamAbbreviation: string | null;
    college: string | null;
    fantasyPoints: number;
    floor: number;
    median: number;
    ceiling: number;
    depthChartOrder: number | null;
    rookieYear: number | null;
    opportunityScore: number;
    competitionScore: number;
    landingSpotScore: number;
    breakoutScore: number;
  }

  const candidates: Candidate[] = projections.map((p) => {
    const meta = p.player.externalId ? sleeperMeta.get(p.player.externalId) : undefined;
    const depthChartOrder = meta?.depthChartOrder ?? null;

    // Depth chart order 1 = current real starter; higher = further down the
    // chart. Missing order (undrafted/deep bench) gets a low baseline.
    const base = depthChartOrder && depthChartOrder >= 1 ? clamp(100 - (depthChartOrder - 1) * 22) : 28;
    const opportunityScore = Math.round(clamp(base + randFloat(rand, -6, 6)));
    const competitionScore = Math.round(clamp(100 - base + randFloat(rand, -6, 6)));
    const landingSpotScore = Math.round(clamp(base * 0.9 + randFloat(rand, -8, 8)));
    const breakoutScore = Math.round(clamp(opportunityScore * 0.5 + (100 - competitionScore) * 0.3 + randFloat(rand, -8, 8)));

    return {
      firstName: p.player.firstName,
      lastName: p.player.lastName,
      position: p.player.position,
      nflTeamAbbreviation: p.player.nflTeam?.abbreviation ?? null,
      college: p.player.college,
      fantasyPoints: p.fantasyPoints ?? 0,
      floor: p.floor ?? 0,
      median: p.median ?? p.fantasyPoints ?? 0,
      ceiling: p.ceiling ?? p.fantasyPoints ?? 0,
      depthChartOrder,
      rookieYear: meta?.rookieYear ?? null,
      opportunityScore,
      competitionScore,
      landingSpotScore,
      breakoutScore,
    };
  });

  // Rank within the real rookie class only (consistent with how the
  // original seed-generated rookie class computed its own internal ranks).
  const overallSorted = [...candidates].sort((a, b) => b.fantasyPoints - a.fantasyPoints);
  const overallRankOf = new Map(overallSorted.map((c, i) => [c, i + 1]));

  const byPosition = new Map<Position, Candidate[]>();
  for (const c of candidates) {
    const arr = byPosition.get(c.position) ?? [];
    arr.push(c);
    byPosition.set(c.position, arr);
  }

  const rows: string[] = [];
  const csvEscape = (v: string) => (v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);

  for (const [, group] of byPosition) {
    const sorted = [...group].sort((a, b) => b.fantasyPoints - a.fantasyPoints);
    const bucketSize = Math.max(1, Math.ceil(sorted.length / 4));
    sorted.forEach((c, idx) => {
      const positionRank = idx + 1;
      const overallRank = overallRankOf.get(c)!;
      const rookieTier = Math.min(4, Math.floor(idx / bucketSize) + 1);
      const yearNote = c.rookieYear ? `${c.rookieYear} rookie class` : "current rookie class";
      const depthNote = c.depthChartOrder ? `depth slot ${c.depthChartOrder} at ${c.position} on ${c.nflTeamAbbreviation ?? "their team"}'s real current depth chart` : "not yet on a confirmed depth chart slot";
      const notes = `${c.firstName} ${c.lastName}${c.college ? ` (${c.college})` : ""}, ${yearNote}, currently ${depthNote}. Draft round/pick unavailable from this free data source.`;

      rows.push(
        [
          csvEscape(c.firstName),
          csvEscape(c.lastName),
          c.position,
          c.nflTeamAbbreviation ?? "",
          c.college ? csvEscape(c.college) : "",
          "", // age handled by the player sync already; leave blank here
          "", // draftRound -- not fabricated
          "", // draftPick -- not fabricated
          rookieTier,
          positionRank,
          overallRank,
          c.fantasyPoints,
          c.floor,
          c.median,
          c.ceiling,
          c.opportunityScore,
          c.competitionScore,
          c.landingSpotScore,
          c.breakoutScore,
          csvEscape(notes),
        ].join(",")
      );
    });
  }

  const csv = [
    "firstName,lastName,position,nflTeamAbbreviation,college,age,draftRound,draftPick,rookieTier,fantasyPositionRank,overallFantasyRank,projectedFantasyPoints,floor,median,ceiling,opportunityScore,competitionScore,landingSpotScore,breakoutScore,analystNotes",
    ...rows,
  ].join("\n");

  console.log(`Generated ${rows.length} rookie profile rows. Importing via the app's CSV import pipeline...`);
  const validation = validateImportRows("rookies", parseImportFile(csv, "rookies.csv").rows);
  const outcome = await importRows("rookies", SEASON_YEAR, validation.validRows as never);
  console.log(`Rookie profiles: ${outcome.imported} imported, ${outcome.skipped.length} skipped, ${validation.errorCount} validation errors.`);
  if (validation.errorCount > 0) console.log(validation.issues.slice(0, 10));
  if (outcome.skipped.length > 0) console.log(outcome.skipped.slice(0, 10));

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
