import { Moon } from "lucide-react";
import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { getSleepers } from "@/lib/queries/sleepers-busts";
import { PageHeader } from "@/components/shared/page-header";
import { SleeperCard } from "@/components/shared/sleeper-card";
import { EmptyState } from "@/components/shared/empty-state";

export default async function SleepersPage() {
  const [season, user] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo()]);
  const league = await getOrCreateDefaultLeague(user.id);

  const sleepers = await getSleepers(season.id, league.scoringFormatPreset, 30);
  const showDdaflAdjustment = !!league.mflLeagueId;

  return (
    <div>
      <PageHeader
        title="Sleeper Finder"
        description={`${season.label} · ${league.scoringFormatPreset.replace("_", " ")} · players the market is pricing below their ranking, opportunity, and situation`}
      />

      {showDdaflAdjustment ? (
        <p className="mb-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">DDAFL Est.</span> is an estimated adjustment for your league&apos;s
          distance-tiered scoring bonuses, based on yards-per-touch efficiency -- not an exact calculation, since real
          per-play distance data isn&apos;t available from season projections.
        </p>
      ) : null}

      {sleepers.length === 0 ? (
        <EmptyState icon={Moon} title="No sleeper candidates yet" description="Sleepers appear once ADP and ranking data are loaded for this season." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sleepers.map((s) => (
            <SleeperCard key={s.player.id} sleeper={s} showDdaflAdjustment={showDdaflAdjustment} />
          ))}
        </div>
      )}
    </div>
  );
}
