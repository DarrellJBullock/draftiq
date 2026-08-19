import { prisma } from "@/lib/db/prisma";

export const DEFAULT_SEASON_YEAR = Number(process.env.NEXT_PUBLIC_DEFAULT_SEASON ?? 2026);

/** Returns the active Season, falling back to the most recent one, or seeding a bare row if none exist. */
export async function getActiveSeason() {
  const active = await prisma.season.findFirst({ where: { isActive: true } });
  if (active) return active;

  const latest = await prisma.season.findFirst({ orderBy: { year: "desc" } });
  if (latest) return latest;

  return prisma.season.create({
    data: { year: DEFAULT_SEASON_YEAR, label: `${DEFAULT_SEASON_YEAR} Fantasy Season`, isActive: true },
  });
}

export async function listSeasons() {
  return prisma.season.findMany({ orderBy: { year: "desc" } });
}
