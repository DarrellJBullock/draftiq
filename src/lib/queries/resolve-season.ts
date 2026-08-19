import { prisma } from "@/lib/db/prisma";
import { getActiveSeason } from "@/lib/season";

export async function resolveSeason(yearParam?: number) {
  if (yearParam) {
    const bySeason = await prisma.season.findUnique({ where: { year: yearParam } });
    if (bySeason) return bySeason;
  }
  return getActiveSeason();
}
