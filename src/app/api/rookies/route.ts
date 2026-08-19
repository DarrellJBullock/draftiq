import type { NextRequest } from "next/server";
import { withValidation } from "@/lib/api-helpers";
import { rookieQuerySchema } from "@/lib/validation/player";
import { resolveSeason } from "@/lib/queries/resolve-season";
import { getRookiePool } from "@/lib/queries/players";

export async function GET(req: NextRequest) {
  return withValidation(async () => {
    const query = rookieQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const season = await resolveSeason(query.season);
    return getRookiePool(season.id, query.season ?? season.year, query);
  });
}
