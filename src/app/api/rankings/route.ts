import type { NextRequest } from "next/server";
import { z } from "zod";
import { withValidation } from "@/lib/api-helpers";
import { positionSchema, scoringFormatSchema, seasonYearSchema } from "@/lib/validation/common";
import { resolveSeason } from "@/lib/queries/resolve-season";
import { prisma } from "@/lib/db/prisma";

const querySchema = z.object({
  season: seasonYearSchema.optional(),
  scoringFormat: scoringFormatSchema.default("PPR"),
  position: positionSchema.optional(),
  source: z.enum(["CONSENSUS", "EXPERT"]).default("CONSENSUS"),
});

export async function GET(req: NextRequest) {
  return withValidation(async () => {
    const query = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const season = await resolveSeason(query.season);
    const rankings = await prisma.ranking.findMany({
      where: {
        seasonId: season.id,
        scoringFormat: query.scoringFormat,
        source: query.source,
        ...(query.position ? { player: { position: query.position } } : {}),
      },
      include: { player: { include: { nflTeam: true } } },
      orderBy: { overallRank: "asc" },
    });
    return rankings;
  });
}
