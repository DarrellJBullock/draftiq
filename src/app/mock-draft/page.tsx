import Link from "next/link";
import { Swords } from "lucide-react";
import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { getUserMockDrafts } from "@/lib/queries/drafts";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { MockDraftSetup } from "./mock-draft-setup";

export default async function MockDraftPage() {
  const [season, user] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo()]);
  const league = await getOrCreateDefaultLeague(user.id);
  const mockDrafts = await getUserMockDrafts(user.id);

  const s = league.settings;
  const defaultRounds = s
    ? s.qbSlots + s.rbSlots + s.wrSlots + s.teSlots + s.flexSlots + s.superflexSlots + (s.kSlot ? 1 : 0) + (s.dstSlot ? 1 : 0) + s.benchSize
    : 16;

  return (
    <div>
      <PageHeader title="Mock Draft Simulator" description="Draft against realistic CPU opponents and get a full post-draft grade." />

      <MockDraftSetup season={season.year} defaultTeamCount={league.teamCount} defaultScoringFormat={league.scoringFormatPreset} defaultRounds={defaultRounds} />

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Recent mock drafts</h2>
        {mockDrafts.length === 0 ? (
          <EmptyState icon={Swords} title="No mock drafts yet" description="Run your first mock draft above to see grades and results here." className="py-10" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mockDrafts.map((m) => (
              <Link key={m.id} href={`/mock-draft/${m.id}`}>
                <Card className="border-border/70 transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">
                        {m.teamCount}-team, pick {m.draftPosition}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.scoringFormat.replace("_", " ")} &middot; {new Date(m.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className="text-sm">{m.overallGrade}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
