import type { Metadata } from "next";
import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { getTierBoard } from "@/lib/queries/tiers";
import { PageHeader } from "@/components/shared/page-header";
import { TiersBoard } from "./tiers-board";

export const metadata: Metadata = { title: "Tiers" };

export default async function TiersPage() {
  const [season, user] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo()]);
  const league = await getOrCreateDefaultLeague(user.id);
  const board = await getTierBoard(season.id, league.scoringFormatPreset);

  return (
    <div>
      <PageHeader
        title="Tiers"
        description={`${season.label} · ${league.scoringFormatPreset.replace("_", " ")} · position-based draft tiers`}
      />
      <TiersBoard board={board} />
    </div>
  );
}
