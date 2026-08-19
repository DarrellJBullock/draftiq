import type { Metadata } from "next";
import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { getRankingsBoard } from "@/lib/queries/rankings";
import { PageHeader } from "@/components/shared/page-header";
import { RankingsExplorer } from "./rankings-explorer";

export const metadata: Metadata = { title: "Rankings" };

export default async function RankingsPage() {
  const [season, user] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo()]);
  const league = await getOrCreateDefaultLeague(user.id);

  const [consensus, expert] = await Promise.all([
    getRankingsBoard(season.id, league.scoringFormatPreset, "CONSENSUS"),
    getRankingsBoard(season.id, league.scoringFormatPreset, "EXPERT"),
  ]);

  return (
    <div>
      <PageHeader
        title="Rankings"
        description={`${season.label} · ${league.scoringFormatPreset.replace("_", " ")} · consensus and expert overall rankings`}
      />
      <RankingsExplorer consensus={consensus} expert={expert} />
    </div>
  );
}
