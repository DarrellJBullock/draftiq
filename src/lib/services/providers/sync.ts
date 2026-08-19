import type { Position } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getDataProviderByName } from "./index";

export interface SyncOutcome {
  provider: string;
  created: number;
  updated: number;
  skipped: { externalId: string; reason: string }[];
}

async function resolveSeason(seasonYear: number) {
  return prisma.season.upsert({
    where: { year: seasonYear },
    update: {},
    create: { year: seasonYear, label: `${seasonYear} Fantasy Season` },
  });
}

/**
 * Pulls real player bios/rosters from a live `NFLDataProvider` and upserts
 * them into the database with `dataSource: "PROVIDER"`. Matches existing
 * rows by `externalId` first (reliable across re-syncs), falling back to a
 * name+position match so a provider sync can link up with a previously
 * seeded/imported player instead of creating a duplicate.
 */
export async function syncPlayersFromProvider(providerName: string, seasonYear: number): Promise<SyncOutcome> {
  const provider = getDataProviderByName(providerName);
  if (provider.name === "seed") {
    throw new Error(`"${providerName}" is not a live provider -- nothing to sync.`);
  }

  const season = await resolveSeason(seasonYear);
  const records = await provider.getPlayers(seasonYear);

  const outcome: SyncOutcome = { provider: provider.name, created: 0, updated: 0, skipped: [] };

  for (const record of records) {
    const validPosition = ["QB", "RB", "WR", "TE", "K", "DST"].includes(record.position);
    if (!validPosition) {
      outcome.skipped.push({ externalId: record.externalId, reason: `Unrecognized position "${record.position}"` });
      continue;
    }

    const nflTeam = record.nflTeamAbbreviation
      ? await prisma.nFLTeam.findUnique({ where: { abbreviation: record.nflTeamAbbreviation } })
      : null;
    if (record.nflTeamAbbreviation && !nflTeam) {
      outcome.skipped.push({ externalId: record.externalId, reason: `Unknown team abbreviation "${record.nflTeamAbbreviation}"` });
      continue;
    }

    const existing =
      (await prisma.player.findUnique({ where: { externalId: record.externalId } })) ??
      (await prisma.player.findFirst({
        where: {
          position: record.position as Position,
          firstName: { equals: record.firstName, mode: "insensitive" },
          lastName: { equals: record.lastName, mode: "insensitive" },
        },
      }));

    const data = {
      firstName: record.firstName,
      lastName: record.lastName,
      position: record.position as Position,
      nflTeamId: nflTeam?.id ?? null,
      jerseyNumber: record.jerseyNumber,
      college: record.college,
      age: record.age,
      isRookie: record.isRookie,
      isFreeAgent: record.isFreeAgent,
      externalId: record.externalId,
      dataSource: "PROVIDER" as const,
      ...(record.injuryStatus ? { injuryStatus: record.injuryStatus } : {}),
    };

    const player = existing
      ? await prisma.player.update({ where: { id: existing.id }, data })
      : await prisma.player.create({ data });

    await prisma.playerSeason.upsert({
      where: { playerId_seasonId: { playerId: player.id, seasonId: season.id } },
      update: {},
      create: { playerId: player.id, seasonId: season.id, dataSource: "PROVIDER" },
    });

    if (existing) outcome.updated++;
    else outcome.created++;
  }

  return outcome;
}
