import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { PageHeader } from "@/components/shared/page-header";
import { AIChat } from "./ai-chat";

export default async function AIAssistantPage() {
  const [season, user] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo()]);
  const league = await getOrCreateDefaultLeague(user.id);

  return (
    <div>
      <PageHeader title="AI Assistant" description={`${season.label} · ${league.scoringFormatPreset.replace("_", " ")} · ask draft questions grounded in this app's data`} />
      <AIChat season={season.year} scoringFormat={league.scoringFormatPreset} />
    </div>
  );
}
