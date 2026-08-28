import { UserCog } from "lucide-react";
import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { getOrCreateManualRoster, getRosterWithPlayers } from "@/lib/queries/roster";
import { getValuedPlayerPool } from "@/lib/queries/value-pool";
import { buildStarterSlots, assignToSlots, projectedPoints, computeRosterGrade, computeRosterInsights } from "@/lib/team-builder/analysis";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { StarterSlotRow, BenchRow, AddToBenchButton } from "./roster-editor";

export default async function TeamBuilderPage() {
  const [season, user] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo()]);
  const league = await getOrCreateDefaultLeague(user.id);
  const settings = league.settings!;

  const rosterStub = await getOrCreateManualRoster(user.id, league.id);
  const roster = await getRosterWithPlayers(rosterStub.id, season.id, league.scoringFormatPreset);

  const starterSlots = buildStarterSlots(settings);
  const { starters, bench } = roster ? assignToSlots(roster.players, starterSlots) : { starters: starterSlots.map((slot) => ({ slot, rosterPlayer: null })), bench: [] };

  const filledStarters = starters.filter((s) => s.rosterPlayer).length;
  const starterValues = starters
    .filter((s) => s.rosterPlayer)
    .map((s) => s.rosterPlayer!.player.projection?.fantasyPoints ?? 0);
  const avgStarterValue = starterValues.length > 0 ? Math.min(100, (starterValues.reduce((a, b) => a + b, 0) / starterValues.length) * 1.6) : 0;
  const grade = computeRosterGrade(filledStarters, starterSlots.length, avgStarterValue);
  const insights = roster ? computeRosterInsights(roster.players, starters) : { strengths: [], weaknesses: [] };

  const rosteredIds = roster ? roster.players.map((rp) => rp.player.id) : [];
  const showDdaflAdjustment = !!league.mflLeagueId;
  const ddaflByPlayerId = new Map<string, number>();
  if (showDdaflAdjustment) {
    const pool = await getValuedPlayerPool(season.id, league.scoringFormatPreset);
    for (const p of pool) ddaflByPlayerId.set(p.id, p.ddaflAdjustment);
  }
  const totalProjected = roster
    ? starters.reduce((sum, s) => sum + (s.rosterPlayer ? projectedPoints(s.rosterPlayer.player, settings) : 0), 0)
    : 0;

  return (
    <div>
      <PageHeader
        title="Team Builder"
        description={`${league.name} · manually build and grade a roster against your league's starting requirements`}
        actions={<Badge className="text-sm">{grade.letter}</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Roster Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{grade.letter}</p>
            <p className="mt-1 text-xs text-muted-foreground">{grade.explanation}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Projected Starter Points</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{totalProjected.toFixed(1)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{league.scoringFormatPreset.replace("_", " ")} season projection</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Roster Size</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{rosteredIds.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {filledStarters}/{starterSlots.length} starting slots filled &middot; {bench.length} on bench
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add players to see roster strengths.</p>
            ) : (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {insights.strengths.map((s, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-emerald-400">&bull;</span>
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Weaknesses</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.weaknesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No glaring weaknesses identified.</p>
            ) : (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {insights.weaknesses.map((w, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-rose-400">&bull;</span>
                    {w}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Starters</h2>
        <div className="space-y-2">
          {starters.map(({ slot, rosterPlayer }) => (
            <StarterSlotRow
              key={slot.id}
              slot={slot}
              player={rosterPlayer?.player ?? null}
              season={season.year}
              scoringFormat={league.scoringFormatPreset}
              rosteredIds={rosteredIds}
              ddaflAdjustment={rosterPlayer ? ddaflByPlayerId.get(rosterPlayer.player.id) : undefined}
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Bench</h2>
          <AddToBenchButton season={season.year} scoringFormat={league.scoringFormatPreset} excludeIds={rosteredIds} />
        </div>
        {bench.length === 0 ? (
          <EmptyState icon={UserCog} title="No bench players yet" description="Add depth and handcuffs to round out your roster." className="py-8" />
        ) : (
          <div className="space-y-1">
            {bench.map((rp) => {
              const emptyStarterSlots = starters.filter((s) => !s.rosterPlayer).map((s) => s.slot);
              return (
                <BenchRow
                  key={rp.id}
                  row={{ slot: rp.slot, player: rp.player }}
                  emptyStarterSlots={emptyStarterSlots}
                  ddaflAdjustment={ddaflByPlayerId.get(rp.player.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
