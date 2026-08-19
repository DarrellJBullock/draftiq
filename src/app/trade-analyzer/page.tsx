import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { PageHeader } from "@/components/shared/page-header";
import { TradeWorkbench } from "./trade-workbench";

export default async function TradeAnalyzerPage() {
  const [season, user] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo()]);
  const league = await getOrCreateDefaultLeague(user.id);

  return (
    <div>
      <PageHeader
        title="Trade Analyzer"
        description={`${season.label} · ${league.scoringFormatPreset.replace("_", " ")} · compare value, risk, and upside across both sides of a deal`}
      />
      <TradeWorkbench season={season.year} scoringFormat={league.scoringFormatPreset} leagueId={league.id} />
    </div>
  );
}
