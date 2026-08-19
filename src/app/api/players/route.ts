import type { NextRequest } from "next/server";
import { withValidation } from "@/lib/api-helpers";
import { playerQuerySchema } from "@/lib/validation/player";
import { resolveSeason } from "@/lib/queries/resolve-season";
import { getPlayerPool } from "@/lib/queries/players";

export async function GET(req: NextRequest) {
  return withValidation(async () => {
    const query = playerQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const season = await resolveSeason(query.season);
    return getPlayerPool(season.id, query);
  });
}
