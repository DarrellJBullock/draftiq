import { Compass } from "lucide-react";
import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { getValuedPlayerPool } from "@/lib/queries/value-pool";
import { getSleepers, getBusts } from "@/lib/queries/sleepers-busts";
import { recommendStrategies, STRATEGY_LABELS } from "@/lib/services/strategy-engine";
import { SKILL_POSITIONS } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { PositionBadge } from "@/components/shared/position-badge";
import { RookieBadge } from "@/components/shared/rookie-badge";
import { ValueIndicator } from "@/components/shared/value-indicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function DraftStrategyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const [season, user] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo()]);
  const league = await getOrCreateDefaultLeague(user.id);
  const settings = league.settings!;

  const teamCount = Number(raw.teamCount) || league.teamCount;
  const draftPosition = Math.min(teamCount, Math.max(1, Number(raw.draftPosition) || Math.ceil(teamCount / 2)));

  const recommendations = recommendStrategies({
    teamCount,
    draftPosition,
    qbSlots: settings.qbSlots,
    superflexSlots: settings.superflexSlots,
    teSlots: settings.teSlots,
    tePremiumBonus: settings.tePremiumBonus,
    receptionPoints: settings.receptionPoints,
    benchSize: settings.benchSize,
  });
  const top = recommendations[0]!;
  const alternatives = recommendations.slice(1, 4);

  const [pool, sleepers, busts] = await Promise.all([
    getValuedPlayerPool(season.id, league.scoringFormatPreset),
    getSleepers(season.id, league.scoringFormatPreset, 6),
    getBusts(season.id, league.scoringFormatPreset, 20),
  ]);

  const skillPool = pool.filter((p) => SKILL_POSITIONS.includes(p.position));
  const priorityPositions = new Set(top.positionPriorities.slice(0, 3));
  const targets = skillPool
    .filter((p) => priorityPositions.has(p.position))
    .sort((a, b) => b.value.overallValue - a.value.overallValue)
    .slice(0, 8);
  const deprioritized = new Set(top.positionPriorities.slice(3));
  const avoid = busts.filter((b) => deprioritized.has(b.player.position)).slice(0, 6);
  const rookieTargets = skillPool
    .filter((p) => p.isRookie)
    .sort((a, b) => b.value.overallValue - a.value.overallValue)
    .slice(0, 6);

  const totalStarters = settings.qbSlots + settings.rbSlots + settings.wrSlots + settings.teSlots + settings.flexSlots + settings.superflexSlots + (settings.kSlot ? 1 : 0) + (settings.dstSlot ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Draft Strategy"
        description={`${league.name} · ${teamCount}-team ${league.scoringFormatPreset.replace("_", " ")} · drafting from pick ${draftPosition}`}
      />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card/50 p-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Team count</label>
          <select name="teamCount" defaultValue={teamCount} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            {[8, 10, 12, 14, 16].map((n) => (
              <option key={n} value={n}>
                {n} teams
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Draft position</label>
          <select name="draftPosition" defaultValue={draftPosition} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            {Array.from({ length: teamCount }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Pick {n}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm">
          Update
        </Button>
      </form>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-primary/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              <Badge>{STRATEGY_LABELS[top.strategy]}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">Fit score {top.fitScore}/100</span>
            </div>
            <CardTitle className="text-base">Recommended strategy for this league</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{top.reasoning}</p>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Position priorities</p>
              <div className="flex flex-wrap gap-1.5">
                {top.positionPriorities.map((pos, i) => (
                  <PositionBadge key={`${pos}-${i}`} position={pos} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                <p className="mb-1 font-semibold">Early rounds</p>
                <p className="text-muted-foreground">{top.earlyRoundPlan}</p>
              </div>
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                <p className="mb-1 font-semibold">Late rounds</p>
                <p className="text-muted-foreground">{top.lateRoundTargets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roster construction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label="QB" value={settings.qbSlots} />
            <Row label="RB" value={settings.rbSlots} />
            <Row label="WR" value={settings.wrSlots} />
            <Row label="TE" value={settings.teSlots} />
            <Row label="FLEX" value={settings.flexSlots} />
            {settings.superflexSlots > 0 ? <Row label="SUPERFLEX" value={settings.superflexSlots} /> : null}
            {settings.kSlot ? <Row label="K" value={1} /> : null}
            {settings.dstSlot ? <Row label="DST" value={1} /> : null}
            <Row label="Bench" value={settings.benchSize} />
            <div className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
              {totalStarters} starting slots &middot; {totalStarters + settings.benchSize} roster spots total
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Alternative strategies</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {alternatives.map((alt) => (
            <Card key={alt.strategy} className="border-border/70">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{STRATEGY_LABELS[alt.strategy]}</Badge>
                  <span className="text-xs text-muted-foreground">{alt.fitScore}/100</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{alt.reasoning}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Players to target</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {targets.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <PositionBadge position={p.position} />
                <span className="min-w-0 flex-1 truncate">
                  {p.firstName} {p.lastName}
                </span>
                {p.isRookie ? <RookieBadge /> : null}
                <ValueIndicator score={p.value.overallValue} className="w-28 shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Players to avoid early</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {avoid.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No major risk flags outside this strategy&apos;s priority positions.</p>
            ) : (
              avoid.map(({ player, bustScore }) => (
                <div key={player.id} className="flex items-center gap-2 text-sm">
                  <PositionBadge position={player.position} />
                  <span className="min-w-0 flex-1 truncate">
                    {player.firstName} {player.lastName}
                  </span>
                  <span className="text-xs font-semibold text-rose-400">Bust {bustScore.toFixed(0)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sleeper targets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sleepers.map(({ player, sleeperScore }) => (
              <div key={player.id} className="flex items-center gap-2 text-sm">
                <PositionBadge position={player.position} />
                <span className="min-w-0 flex-1 truncate">
                  {player.firstName} {player.lastName}
                </span>
                <span className="text-xs font-semibold text-emerald-400">Sleeper {sleeperScore.toFixed(0)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rookie targets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rookieTargets.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <PositionBadge position={p.position} />
                <span className="min-w-0 flex-1 truncate">
                  {p.firstName} {p.lastName}
                </span>
                <ValueIndicator score={p.value.overallValue} className="w-28 shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
