import type { NextRequest } from "next/server";
import { z } from "zod";
import { withValidation } from "@/lib/api-helpers";
import { scoringFormatSchema, seasonYearSchema } from "@/lib/validation/common";
import { resolveSeason } from "@/lib/queries/resolve-season";
import { getADPBoard, getBiggestADPMovers } from "@/lib/queries/adp";

const querySchema = z.object({
  season: seasonYearSchema.optional(),
  scoringFormat: scoringFormatSchema.default("PPR"),
  view: z.enum(["board", "movers"]).default("board"),
});

export async function GET(req: NextRequest) {
  return withValidation(async () => {
    const query = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const season = await resolveSeason(query.season);
    if (query.view === "movers") return getBiggestADPMovers(season.id, query.scoringFormat);
    return getADPBoard(season.id, query.scoringFormat);
  });
}
