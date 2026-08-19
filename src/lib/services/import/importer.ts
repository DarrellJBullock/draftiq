import type { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { IMPORT_ROW_SCHEMAS, type ImportType } from "@/lib/validation/import";

export interface ImportOutcome {
  imported: number;
  skipped: { index: number; reason: string }[];
}

async function findPlayer(firstName: string, lastName: string, position: string) {
  return prisma.player.findFirst({
    where: { firstName: { equals: firstName, mode: "insensitive" }, lastName: { equals: lastName, mode: "insensitive" }, position: position as never },
  });
}

async function resolveSeasonByYear(seasonYear: number) {
  const season = await prisma.season.findUnique({ where: { year: seasonYear } });
  if (!season) throw new Error(`Season ${seasonYear} does not exist -- create it first.`);
  return season;
}

export async function importRows<K extends ImportType>(
  type: K,
  seasonYear: number,
  rows: z.infer<(typeof IMPORT_ROW_SCHEMAS)[K]>[]
): Promise<ImportOutcome> {
  const skipped: ImportOutcome["skipped"] = [];
  let imported = 0;

  if (type === "teams") {
    for (const [i, row] of (rows as z.infer<typeof IMPORT_ROW_SCHEMAS.teams>[]).entries()) {
      await prisma.nFLTeam.upsert({ where: { abbreviation: row.abbreviation }, update: row, create: row });
      imported++;
      void i;
    }
    return { imported, skipped };
  }

  if (type === "players" || type === "rookies") {
    const season = await resolveSeasonByYear(seasonYear);
    for (const [i, row] of (rows as (z.infer<typeof IMPORT_ROW_SCHEMAS.players> | z.infer<typeof IMPORT_ROW_SCHEMAS.rookies>)[]).entries()) {
      const team = row.nflTeamAbbreviation ? await prisma.nFLTeam.findUnique({ where: { abbreviation: row.nflTeamAbbreviation.toUpperCase() } }) : null;
      if (row.nflTeamAbbreviation && !team) {
        skipped.push({ index: i, reason: `Unknown team abbreviation "${row.nflTeamAbbreviation}"` });
        continue;
      }

      const existing = await findPlayer(row.firstName, row.lastName, row.position);
      const isRookieRow = type === "rookies";

      const player = existing
        ? await prisma.player.update({
            where: { id: existing.id },
            data: {
              nflTeamId: team?.id,
              college: row.college,
              age: row.age,
              dataSource: "USER",
              ...(type === "players" ? { isRookie: (row as z.infer<typeof IMPORT_ROW_SCHEMAS.players>).isRookie, isFreeAgent: (row as z.infer<typeof IMPORT_ROW_SCHEMAS.players>).isFreeAgent } : { isRookie: true }),
            },
          })
        : await prisma.player.create({
            data: {
              firstName: row.firstName,
              lastName: row.lastName,
              position: row.position,
              nflTeamId: team?.id,
              college: row.college,
              age: row.age,
              isRookie: isRookieRow || (row as z.infer<typeof IMPORT_ROW_SCHEMAS.players>).isRookie || false,
              isFreeAgent: type === "players" ? (row as z.infer<typeof IMPORT_ROW_SCHEMAS.players>).isFreeAgent ?? false : false,
              dataSource: "USER",
            },
          });

      await prisma.playerSeason.upsert({
        where: { playerId_seasonId: { playerId: player.id, seasonId: season.id } },
        update: { dataSource: "USER", ...(type === "players" ? { byeWeek: (row as z.infer<typeof IMPORT_ROW_SCHEMAS.players>).byeWeek } : {}) },
        create: { playerId: player.id, seasonId: season.id, dataSource: "USER", byeWeek: type === "players" ? (row as z.infer<typeof IMPORT_ROW_SCHEMAS.players>).byeWeek : undefined },
      });

      if (type === "rookies") {
        const r = row as z.infer<typeof IMPORT_ROW_SCHEMAS.rookies>;
        await prisma.rookieProfile.upsert({
          where: { playerId: player.id },
          update: {
            draftYear: seasonYear,
            draftRound: r.draftRound,
            draftPick: r.draftPick,
            rookieTier: r.rookieTier,
            projectedFantasyPoints: r.projectedFantasyPoints,
            floor: r.floor,
            median: r.median,
            ceiling: r.ceiling,
            opportunityScore: r.opportunityScore,
            competitionScore: r.competitionScore,
            landingSpotScore: r.landingSpotScore,
            breakoutScore: r.breakoutScore,
            analystNotes: r.analystNotes,
          },
          create: {
            playerId: player.id,
            draftYear: seasonYear,
            draftRound: r.draftRound,
            draftPick: r.draftPick,
            rookieTier: r.rookieTier,
            projectedFantasyPoints: r.projectedFantasyPoints,
            floor: r.floor,
            median: r.median,
            ceiling: r.ceiling,
            opportunityScore: r.opportunityScore,
            competitionScore: r.competitionScore,
            landingSpotScore: r.landingSpotScore,
            breakoutScore: r.breakoutScore,
            analystNotes: r.analystNotes,
          },
        });
      }

      imported++;
    }
    return { imported, skipped };
  }

  // rankings / adp / projections all key off an existing player + season.
  const season = await resolveSeasonByYear(seasonYear);
  const typedRows = rows as Array<{ firstName: string; lastName: string; position: string; scoringFormat: "STANDARD" | "HALF_PPR" | "PPR" | "SUPERFLEX" | "TE_PREMIUM" | "CUSTOM" }>;

  for (const [i, row] of typedRows.entries()) {
    const player = await findPlayer(row.firstName, row.lastName, row.position);
    if (!player) {
      skipped.push({ index: i, reason: `No matching player found for ${row.firstName} ${row.lastName} (${row.position})` });
      continue;
    }

    if (type === "rankings") {
      const r = row as z.infer<typeof IMPORT_ROW_SCHEMAS.rankings>;
      await prisma.ranking.upsert({
        where: { seasonId_playerId_source_scoringFormat: { seasonId: season.id, playerId: player.id, source: r.source, scoringFormat: r.scoringFormat } },
        update: { overallRank: r.overallRank, positionRank: r.positionRank },
        create: { seasonId: season.id, playerId: player.id, source: r.source, scoringFormat: r.scoringFormat, overallRank: r.overallRank, positionRank: r.positionRank },
      });
    } else if (type === "adp") {
      const r = row as z.infer<typeof IMPORT_ROW_SCHEMAS.adp>;
      await prisma.aDP.upsert({
        where: { seasonId_playerId_scoringFormat: { seasonId: season.id, playerId: player.id, scoringFormat: r.scoringFormat } },
        update: { overallADP: r.overallADP, positionADP: r.positionADP, adpDelta: r.adpDelta },
        create: { seasonId: season.id, playerId: player.id, scoringFormat: r.scoringFormat, overallADP: r.overallADP, positionADP: r.positionADP, adpDelta: r.adpDelta },
      });
    } else if (type === "projections") {
      const r = row as z.infer<typeof IMPORT_ROW_SCHEMAS.projections>;
      const { firstName: _f, lastName: _l, position: _p, scoringFormat, ...stat } = r;
      void _f;
      void _l;
      void _p;
      await prisma.projection.upsert({
        where: { seasonId_playerId_scoringFormat: { seasonId: season.id, playerId: player.id, scoringFormat } },
        update: stat,
        create: { seasonId: season.id, playerId: player.id, scoringFormat, ...stat },
      });
    }

    imported++;
  }

  return { imported, skipped };
}
