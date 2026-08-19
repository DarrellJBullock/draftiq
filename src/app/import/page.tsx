import { PageHeader } from "@/components/shared/page-header";
import { getActiveSeason } from "@/lib/season";
import { ImportWorkbench } from "./import-workbench";

export default async function ImportPage() {
  const season = await getActiveSeason();

  return (
    <div>
      <PageHeader
        title="Data Import"
        description="Upload CSV or JSON files to add or update players, rookies, rankings, ADP, projections, and NFL teams. Templates live in /data/templates."
      />
      <ImportWorkbench defaultSeasonYear={season.year} />
    </div>
  );
}
