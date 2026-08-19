/**
 * Generates rankings + ADP + projection rows for players sourced from a live
 * provider (dataSource: "PROVIDER" -- real names/teams, but no real
 * ranking/ADP/projection feed exists for free) and imports them through the
 * app's actual CSV import pipeline (parse -> validate -> import), the same
 * code path `/api/import` and the `/import` page use.
 *
 * Quality is estimated from Sleeper's real `depth_chart_order` per team --
 * an objective, current signal (1 = current starter) -- run through the
 * same quality-band -> statline -> fantasy-points model already used for
 * the seeded demo dataset (prisma/seed/statlines.ts), so real and demo
 * players are scored on a consistent, documented, non-fabricated basis.
 * This is a generated estimate, not a real ADP/projections feed --
 * dataSource is set to "USER" (import-sourced) accordingly.
 *
 * Usage: npx tsx scripts/generate-provider-data.ts
 */
import { PrismaClient, type Position } from "@prisma/client";
import { mulberry32 } from "../prisma/seed/rng";
import { generateStatLine, fantasyPointsFor, floorCeiling } from "../prisma/seed/statlines";
import { deriveSeedData, SEED_FORMATS } from "../prisma/seed/derive";
import { parseImportFile } from "../src/lib/services/import/parser";
import { validateImportRows } from "../src/lib/services/import/validator";
import { importRows } from "../src/lib/services/import/importer";

const SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl";
const SEASON_YEAR = 2026;
const SEED = 20260118;

// Same shape as prisma/seed/players.ts's ROSTER_SPEC quality bands, indexed
// by (position, depth_chart_order - 1). Sleeper's depth chart is the real
// signal standing in for the "QB1/QB2/RB1/RB2/RB3/..." roster slots the
// seed generator assigns synthetically to demo players.
const QUALITY_BANDS: Record<Position, [number, number][]> = {
  QB: [[0.55, 0.98], [0.05, 0.35]],
  RB: [[0.55, 0.97], [0.35, 0.65], [0.1, 0.4]],
  WR: [[0.6, 0.98], [0.45, 0.75], [0.25, 0.55], [0.05, 0.3]],
  TE: [[0.45, 0.9], [0.05, 0.3]],
  K: [[0.3, 0.7]],
  DST: [[0.3, 0.78]],
};
const DEEP_BENCH_BAND: [number, number] = [0.02, 0.15];

function qualityFor(rand: () => number, position: Position, depthChartOrder: number | null): number {
  const bands = QUALITY_BANDS[position];
  const band = depthChartOrder && depthChartOrder >= 1 ? bands[depthChartOrder - 1] ?? DEEP_BENCH_BAND : DEEP_BENCH_BAND;
  const [lo, hi] = band;
  return Math.min(1, Math.max(0, rand() * (hi - lo) + lo));
}

async function fetchDepthChartOrders(): Promise<Map<string, number | null>> {
  const res = await fetch(SLEEPER_PLAYERS_URL, { headers: { "User-Agent": "DraftIQ (https://github.com/DarrellJBullock/draftiq)" } });
  if (!res.ok) throw new Error(`Sleeper API returned ${res.status}`);
  const raw = (await res.json()) as Record<string, { depth_chart_order: number | null }>;
  const map = new Map<string, number | null>();
  for (const [id, p] of Object.entries(raw)) map.set(id, p.depth_chart_order ?? null);
  return map;
}

async function main() {
  const prisma = new PrismaClient();
  const rand = mulberry32(SEED);

  console.log("Fetching current depth chart data from Sleeper...");
  const depthChartByExternalId = await fetchDepthChartOrders();

  const players = await prisma.player.findMany({
    where: { dataSource: "PROVIDER" },
    select: { id: true, position: true, externalId: true, firstName: true, lastName: true },
  });
  console.log(`Generating projections for ${players.length} provider-sourced players...`);

  const derivedInputs = players.map((p) => {
    const depthOrder = p.externalId ? depthChartByExternalId.get(p.externalId) ?? null : null;
    const quality = qualityFor(rand, p.position, depthOrder);
    const stat = generateStatLine(rand, p.position, quality);
    return { id: p.id, position: p.position, stat };
  });

  const derived = deriveSeedData(rand, derivedInputs);
  const playerById = new Map(players.map((p) => [p.id, p]));

  const csvEscape = (v: string) => (v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);

  const projectionRows = derived.projections.map((p) => {
    const player = playerById.get(p.playerId)!;
    const { floor, median, ceiling } = floorCeiling(p.fantasyPoints, player.position);
    return [
      player.firstName,
      player.lastName,
      player.position,
      p.scoringFormat,
      p.stat.games,
      p.stat.attempts ?? "",
      p.stat.completions ?? "",
      p.stat.passingYards ?? "",
      p.stat.passingTDs ?? "",
      p.stat.interceptions ?? "",
      p.stat.rushAttempts ?? "",
      p.stat.rushingYards ?? "",
      p.stat.rushingTDs ?? "",
      p.stat.targets ?? "",
      p.stat.receptions ?? "",
      p.stat.receivingYards ?? "",
      p.stat.receivingTDs ?? "",
      p.stat.fieldGoalsMade ?? "",
      p.stat.extraPointsMade ?? "",
      fantasyPointsFor(p.stat, p.scoringFormat, player.position),
      floor,
      median,
      ceiling,
    ].join(",");
  });

  const adpRows = derived.adps.map((a) => {
    const player = playerById.get(a.playerId)!;
    return [csvEscape(player.firstName), csvEscape(player.lastName), player.position, a.scoringFormat, a.overallADP, a.positionADP, a.adpDelta].join(",");
  });

  const rankingRows = derived.rankings.map((r) => {
    const player = playerById.get(r.playerId)!;
    return [csvEscape(player.firstName), csvEscape(player.lastName), player.position, r.scoringFormat, r.source, r.overallRank, r.positionRank].join(",");
  });

  const projectionsCsv = [
    "firstName,lastName,position,scoringFormat,games,attempts,completions,passingYards,passingTDs,interceptions,rushAttempts,rushingYards,rushingTDs,targets,receptions,receivingYards,receivingTDs,fieldGoalsMade,extraPointsMade,fantasyPoints,floor,median,ceiling",
    ...projectionRows,
  ].join("\n");
  const adpCsv = ["firstName,lastName,position,scoringFormat,overallADP,positionADP,adpDelta", ...adpRows].join("\n");
  const rankingsCsv = ["firstName,lastName,position,scoringFormat,source,overallRank,positionRank", ...rankingRows].join("\n");

  console.log(
    `Generated ${SEED_FORMATS.length} formats x ${players.length} players = ${projectionRows.length} projection rows, ${adpRows.length} ADP rows, ${rankingRows.length} ranking rows.`
  );

  console.log("Importing projections via the app's CSV import pipeline...");
  const projValidation = validateImportRows("projections", parseImportFile(projectionsCsv, "projections.csv").rows);
  const projOutcome = await importRows("projections", SEASON_YEAR, projValidation.validRows as never);
  console.log(`Projections: ${projOutcome.imported} imported, ${projOutcome.skipped.length} skipped, ${projValidation.errorCount} validation errors.`);
  if (projValidation.errorCount > 0) console.log(projValidation.issues.slice(0, 10));

  console.log("Importing ADP via the app's CSV import pipeline...");
  const adpValidation = validateImportRows("adp", parseImportFile(adpCsv, "adp.csv").rows);
  const adpOutcome = await importRows("adp", SEASON_YEAR, adpValidation.validRows as never);
  console.log(`ADP: ${adpOutcome.imported} imported, ${adpOutcome.skipped.length} skipped, ${adpValidation.errorCount} validation errors.`);
  if (adpValidation.errorCount > 0) console.log(adpValidation.issues.slice(0, 10));

  console.log("Importing rankings via the app's CSV import pipeline...");
  const rankingValidation = validateImportRows("rankings", parseImportFile(rankingsCsv, "rankings.csv").rows);
  const rankingOutcome = await importRows("rankings", SEASON_YEAR, rankingValidation.validRows as never);
  console.log(`Rankings: ${rankingOutcome.imported} imported, ${rankingOutcome.skipped.length} skipped, ${rankingValidation.errorCount} validation errors.`);
  if (rankingValidation.errorCount > 0) console.log(rankingValidation.issues.slice(0, 10));

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
