import { PageHeader } from "@/components/shared/page-header";
import { getActiveSeason } from "@/lib/season";
import { AVAILABLE_PROVIDER_NAMES } from "@/lib/services/providers";
import { ImportWorkbench } from "./import-workbench";
import { LiveSync } from "./live-sync";

export default async function ImportPage() {
  const season = await getActiveSeason();
  const liveProviders = AVAILABLE_PROVIDER_NAMES.filter((p) => p !== "seed");

  return (
    <div>
      <PageHeader
        title="Data Import"
        description="Upload CSV or JSON files to add or update players, rookies, rankings, ADP, projections, and NFL teams. Templates live in /data/templates."
      />
      <div className="mb-6">
        <LiveSync providers={liveProviders} defaultSeasonYear={season.year} />
      </div>
      <ImportWorkbench defaultSeasonYear={season.year} />
    </div>
  );
}
