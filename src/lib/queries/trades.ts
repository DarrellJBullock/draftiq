import type { ScoringFormatPreset } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getValuedPlayerPool } from "./value-pool";
import { evaluateTrade } from "@/lib/services/trade-engine";
import type { AnalyzeTradeInput } from "@/lib/validation/trade";

export async function analyzeAndSaveTrade(userId: string, input: AnalyzeTradeInput) {
  const season = await prisma.season.findFirst({ where: { year: input.season } });
  if (!season) throw new Error(`No season found for year ${input.season}`);

  const pool = await getValuedPlayerPool(season.id, input.scoringFormat as ScoringFormatPreset);
  const byId = new Map(pool.map((p) => [p.id, p]));

  const buildSide = (ids: string[]) =>
    ids
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({ playerId: p.id, position: p.position, value: p.value.overallValue, risk: p.playerSeason?.riskLevel ?? "MEDIUM" as const }));

  const sideA = buildSide(input.sideAPlayerIds);
  const sideB = buildSide(input.sideBPlayerIds);
  const result = evaluateTrade(sideA, sideB);

  const explanationDetail = `${result.explanation} Side A: ${sideA
    .map((a) => byId.get(a.playerId)?.lastName)
    .join(", ")}. Side B: ${sideB.map((b) => byId.get(b.playerId)?.lastName).join(", ")}.`;

  const trade = await prisma.trade.create({
    data: {
      userId,
      leagueId: input.leagueId,
      seasonId: season.id,
      sideAPlayerIds: input.sideAPlayerIds,
      sideBPlayerIds: input.sideBPlayerIds,
      sideAValue: result.sideA.totalValue,
      sideBValue: result.sideB.totalValue,
      winner: result.winner,
      gradeA: result.gradeA,
      gradeB: result.gradeB,
      explanation: explanationDetail,
      riskNotes: [...sideA, ...sideB].some((a) => a.risk === "HIGH") ? "One or more players carry elevated injury/role risk." : null,
      upsideNotes: null,
    },
  });

  return { trade, result, sideAPlayers: sideA.map((a) => byId.get(a.playerId)!), sideBPlayers: sideB.map((b) => byId.get(b.playerId)!) };
}
