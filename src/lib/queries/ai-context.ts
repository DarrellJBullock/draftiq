import type { ScoringFormatPreset } from "@prisma/client";
import { getValuedPlayerPool } from "./value-pool";
import type { AIPlayerContext, AIRequestContext } from "@/lib/services/ai/types";

export async function buildAIContext(
  seasonId: string,
  seasonYear: number,
  scoringFormat: ScoringFormatPreset,
  options: { question?: string; limit?: number } = {}
): Promise<AIRequestContext> {
  const pool = await getValuedPlayerPool(seasonId, scoringFormat);
  const sorted = [...pool].sort((a, b) => (a.ranking?.overallRank ?? 999) - (b.ranking?.overallRank ?? 999));

  const lower = (options.question ?? "").toLowerCase();
  const mentioned = sorted.filter((p) => lower.includes(`${p.firstName} ${p.lastName}`.toLowerCase()));

  const limit = options.limit ?? 60;
  const top = sorted.slice(0, limit);
  const merged = [...mentioned, ...top.filter((p) => !mentioned.includes(p))].slice(0, limit + mentioned.length);

  const players: AIPlayerContext[] = merged.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    position: p.position,
    team: p.nflTeam?.abbreviation ?? null,
    overallRank: p.ranking?.overallRank ?? 999,
    positionRank: p.ranking?.positionRank ?? 999,
    adp: p.adp?.overallADP ?? 999,
    projectedPoints: p.projection?.fantasyPoints ?? 0,
    tier: p.playerSeason?.tier?.tierNumber ?? null,
    isRookie: p.isRookie,
    injuryStatus: p.injuryStatus,
  }));

  return { season: seasonYear, scoringFormat, players };
}
