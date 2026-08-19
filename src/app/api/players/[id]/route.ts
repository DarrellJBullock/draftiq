import type { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { jsonError } from "@/lib/api-helpers";
import { scoringFormatSchema, seasonYearSchema } from "@/lib/validation/common";
import { resolveSeason } from "@/lib/queries/resolve-season";
import { getPlayerDetail } from "@/lib/queries/players";

const querySchema = z.object({
  season: seasonYearSchema.optional(),
  scoringFormat: scoringFormatSchema.default("PPR"),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const query = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const season = await resolveSeason(query.season);
    const player = await getPlayerDetail(id, season.id, query.scoringFormat);
    if (!player) return jsonError("Player not found", 404);
    return Response.json(player);
  } catch (error) {
    if (error instanceof ZodError) return jsonError(error.issues.map((i) => i.message).join("; "), 422);
    console.error(error);
    return jsonError("Unexpected error", 500);
  }
}
