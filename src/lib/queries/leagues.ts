import { prisma } from "@/lib/db/prisma";
import type { CreateLeagueInput } from "@/lib/validation/league";

export async function getUserLeagues(userId: string) {
  return prisma.league.findMany({ where: { userId }, include: { settings: true }, orderBy: { createdAt: "desc" } });
}

export async function getLeagueWithSettings(leagueId: string) {
  return prisma.league.findUnique({ where: { id: leagueId }, include: { settings: true } });
}

export async function createLeague(userId: string, input: CreateLeagueInput) {
  return prisma.league.create({
    data: {
      userId,
      name: input.name,
      teamCount: input.teamCount,
      scoringFormatPreset: input.scoringFormatPreset,
      settings: { create: input.settings ?? {} },
    },
    include: { settings: true },
  });
}

export async function getOrCreateDefaultLeague(userId: string) {
  const existing = await prisma.league.findFirst({ where: { userId }, include: { settings: true }, orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return createLeague(userId, { name: "My League", teamCount: 12, scoringFormatPreset: "PPR" });
}

export async function updateLeague(leagueId: string, input: { name: string; teamCount: number; scoringFormatPreset: CreateLeagueInput["scoringFormatPreset"] }) {
  return prisma.league.update({ where: { id: leagueId }, data: input });
}

export async function updateLeagueSettings(leagueId: string, input: Partial<import("@/lib/validation/league").LeagueSettingsInput>) {
  return prisma.leagueSettings.update({ where: { leagueId }, data: input });
}

export async function deleteLeague(userId: string, leagueId: string) {
  return prisma.league.deleteMany({ where: { id: leagueId, userId } });
}
