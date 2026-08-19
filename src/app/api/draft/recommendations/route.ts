import type { NextRequest } from "next/server";
import { z } from "zod";
import { withValidation } from "@/lib/api-helpers";
import { scoringFormatSchema, seasonYearSchema } from "@/lib/validation/common";
import { resolveSeason } from "@/lib/queries/resolve-season";
import { getValuedPlayerPool } from "@/lib/queries/value-pool";
import {
  getBestAvailable,
  getBestValue,
  getHighUpside,
  getRookieTargets,
  getSafePicks,
  whoShouldIDraft,
  type RecommendationCandidate,
} from "@/lib/services/draft-engine/recommendations";
import { SKILL_POSITIONS } from "@/types";

const querySchema = z.object({
  season: seasonYearSchema.optional(),
  scoringFormat: scoringFormatSchema.default("PPR"),
  draftedPlayerIds: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : [])),
  focusPlayerId: z.string().optional(),
  rosterNeed: z.coerce.number().min(0).max(1).default(0.5),
});

export async function GET(req: NextRequest) {
  return withValidation(async () => {
    const query = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const season = await resolveSeason(query.season);
    const pool = await getValuedPlayerPool(season.id, query.scoringFormat);
    const drafted = new Set(query.draftedPlayerIds);

    const candidates: RecommendationCandidate[] = pool
      .filter((p) => !drafted.has(p.id))
      .map((p) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        position: p.position,
        overallRank: p.ranking?.overallRank ?? 999,
        adp: p.adp?.overallADP ?? 999,
        projectedPoints: p.projection?.fantasyPoints ?? 0,
        isRookie: p.isRookie,
        riskLevel: p.playerSeason?.riskLevel ?? "MEDIUM",
        value: p.value,
      }));

    const skillCandidates = candidates.filter((c) => SKILL_POSITIONS.includes(c.position));

    const focus = query.focusPlayerId ? candidates.find((c) => c.id === query.focusPlayerId) : undefined;

    return {
      bestAvailable: getBestAvailable(candidates, 15),
      bestValue: getBestValue(skillCandidates, 15),
      rookieTargets: getRookieTargets(candidates, 15),
      safePicks: getSafePicks(skillCandidates, 15),
      highUpside: getHighUpside(skillCandidates, 15),
      whoShouldIDraft: focus ? whoShouldIDraft(focus, candidates, query.rosterNeed) : null,
    };
  });
}
