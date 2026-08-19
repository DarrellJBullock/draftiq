import type { NextRequest } from "next/server";
import { z } from "zod";
import { withValidation } from "@/lib/api-helpers";
import { scoringFormatSchema, seasonYearSchema } from "@/lib/validation/common";
import { resolveSeason } from "@/lib/queries/resolve-season";
import { getBusts } from "@/lib/queries/sleepers-busts";

const querySchema = z.object({
  season: seasonYearSchema.optional(),
  scoringFormat: scoringFormatSchema.default("PPR"),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export async function GET(req: NextRequest) {
  return withValidation(async () => {
    const query = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const season = await resolveSeason(query.season);
    return getBusts(season.id, query.scoringFormat, query.limit);
  });
}
