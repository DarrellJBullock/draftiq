import type { ScoringFormatPreset } from "@prisma/client";
import { getValuedPlayerPool } from "./value-pool";
import { computeBustScore, computeSleeperScore } from "@/lib/services/sleeper-bust";
import { SKILL_POSITIONS } from "@/types";

export async function getSleepers(seasonId: string, scoringFormat: ScoringFormatPreset, limit = 30) {
  const pool = await getValuedPlayerPool(seasonId, scoringFormat);
  return pool
    .filter((p) => SKILL_POSITIONS.includes(p.position) && p.adp?.overallADP && p.ranking?.overallRank)
    .map((p) => ({
      player: p,
      ...computeSleeperScore({
        adp: p.adp!.overallADP,
        overallRank: p.ranking!.overallRank,
        isRookie: p.isRookie,
        returningFromInjury: p.returningFromInjury,
        opportunityScore: p.rookieProfile?.opportunityScore ?? undefined,
      }),
    }))
    .sort((a, b) => b.sleeperScore - a.sleeperScore)
    .slice(0, limit);
}

export async function getBusts(seasonId: string, scoringFormat: ScoringFormatPreset, limit = 30) {
  const pool = await getValuedPlayerPool(seasonId, scoringFormat);
  return pool
    .filter((p) => SKILL_POSITIONS.includes(p.position) && p.adp?.overallADP && p.ranking?.overallRank)
    .map((p) => ({
      player: p,
      ddaflAdjustment: p.ddaflAdjustment,
      ...computeBustScore({
        adp: p.adp!.overallADP,
        overallRank: p.ranking!.overallRank,
        age: p.age,
        riskLevel: p.playerSeason?.riskLevel ?? "MEDIUM",
        injuryStatus: p.injuryStatus,
        trend: p.playerSeason?.trend ?? null,
      }),
    }))
    .sort((a, b) => b.bustScore - a.bustScore)
    .slice(0, limit);
}
