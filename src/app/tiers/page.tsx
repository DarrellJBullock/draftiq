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
  const showDdaflAdjustment = !!league.mflLeagueId;

  return (
    <div>
      <PageHeader
        title="Tiers"
        description={`${season.label} · ${league.scoringFormatPreset.replace("_", " ")} · position-based draft tiers`}
      />
      {showDdaflAdjustment ? (
        <p className="mb-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">DDAFL Est.</span> is an estimated adjustment for your league&apos;s
          distance-tiered scoring bonuses, based on yards-per-touch efficiency -- not an exact calculation, since real
          per-play distance data isn&apos;t available from season projections.
        </p>
      ) : null}
      <TiersBoard board={board} showDdaflAdjustment={showDdaflAdjustment} />
    </div>
  );
}
