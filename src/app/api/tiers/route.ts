import type { NextRequest } from "next/server";
import { z } from "zod";
import { withValidation } from "@/lib/api-helpers";
import { scoringFormatSchema, seasonYearSchema } from "@/lib/validation/common";
import { resolveSeason } from "@/lib/queries/resolve-season";
import { getTierBoard } from "@/lib/queries/tiers";

const querySchema = z.object({
  season: seasonYearSchema.optional(),
  scoringFormat: scoringFormatSchema.default("PPR"),
});

export async function GET(req: NextRequest) {
  return withValidation(async () => {
    const query = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const season = await resolveSeason(query.season);
    return getTierBoard(season.id, query.scoringFormat);
  });
}
