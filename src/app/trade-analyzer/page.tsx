import type { Position } from "@prisma/client";
import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { getValuedPlayerPool } from "@/lib/queries/value-pool";
import { computePositionAverageYPT } from "@/lib/services/scoring/ddafl-adjustment";
import { POSITIONS } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { TradeWorkbench } from "./trade-workbench";

export default async function TradeAnalyzerPage() {
  const [season, user] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo()]);
  const league = await getOrCreateDefaultLeague(user.id);

  const showDdaflAdjustment = !!league.mflLeagueId;
  const positionAverageYPT: Partial<Record<Position, number | null>> = {};
  if (showDdaflAdjustment) {
    const pool = await getValuedPlayerPool(season.id, league.scoringFormatPreset);
    const inputs = pool.map((p) => ({
      position: p.position,
      rushAttempts: p.projection?.rushAttempts,
      rushingYards: p.projection?.rushingYards,
      receptions: p.projection?.receptions,
      receivingYards: p.projection?.receivingYards,
      attempts: p.projection?.attempts,
      passingYards: p.projection?.passingYards,
    }));
    for (const pos of POSITIONS) positionAverageYPT[pos] = computePositionAverageYPT(inputs, pos);
  }

  return (
    <div>
      <PageHeader
        title="Trade Analyzer"
        description={`${season.label} · ${league.scoringFormatPreset.replace("_", " ")} · compare value, risk, and upside across both sides of a deal`}
      />
      <TradeWorkbench
        season={season.year}
        scoringFormat={league.scoringFormatPreset}
        leagueId={league.id}
        showDdaflAdjustment={showDdaflAdjustment}
        positionAverageYPT={positionAverageYPT}
      />
    </div>
  );
}
