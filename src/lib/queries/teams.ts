import { prisma } from "@/lib/db/prisma";

/** All NFL teams, used to populate team filter dropdowns. */
export async function getNFLTeams() {
  return prisma.nFLTeam.findMany({ orderBy: { name: "asc" } });
}
