import { ShieldAlert } from "lucide-react";
import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { getBusts } from "@/lib/queries/sleepers-busts";
import { PageHeader } from "@/components/shared/page-header";
import { BustCard } from "@/components/shared/bust-card";
import { EmptyState } from "@/components/shared/empty-state";

export default async function BustsPage() {
  const [season, user] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo()]);
  const league = await getOrCreateDefaultLeague(user.id);

  const busts = await getBusts(season.id, league.scoringFormatPreset, 30);

  return (
    <div>
      <PageHeader
        title="Bust Finder"
        description={`${season.label} · ${league.scoringFormatPreset.replace("_", " ")} · players being drafted ahead of their underlying ranking and risk profile`}
      />

      {busts.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No bust risks flagged yet" description="Risk flags appear once ADP, ranking, and risk data are loaded for this season." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {busts.map((b) => (
            <BustCard key={b.player.id} bust={b} />
          ))}
        </div>
      )}
    </div>
  );
}
