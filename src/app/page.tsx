import Link from "next/link";
import { Trophy, Users, Sparkles, Moon, TrendingUp, Swords, ArrowRight } from "lucide-react";
import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { getValuedPlayerPool } from "@/lib/queries/value-pool";
import { getRookieWatch } from "@/lib/queries/rookie-watch";
import { getSleepers } from "@/lib/queries/sleepers-busts";
import { getBiggestADPMovers } from "@/lib/queries/adp";
import { getTierBoard } from "@/lib/queries/tiers";
import { getUserMockDrafts } from "@/lib/queries/drafts";
import { recommendStrategies } from "@/lib/services/strategy-engine";
import { SKILL_POSITIONS } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { PositionBadge } from "@/components/shared/position-badge";
import { RookieBadge } from "@/components/shared/rookie-badge";
import { ValueIndicator } from "@/components/shared/value-indicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default async function DashboardPage() {
  const [season, user] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo()]);
  const league = await getOrCreateDefaultLeague(user.id);

  const [pool, rookieWatch, sleepers, adpMovers, tierBoard, mockDrafts] = await Promise.all([
    getValuedPlayerPool(season.id, league.scoringFormatPreset),
    getRookieWatch(season.id, season.year),
    getSleepers(season.id, league.scoringFormatPreset, 3),
    getBiggestADPMovers(season.id, league.scoringFormatPreset, 5),
    getTierBoard(season.id, league.scoringFormatPreset),
    getUserMockDrafts(user.id),
  ]);

  // K/DST are excluded from cross-position "best value" comparisons: their tight
  // point ranges make the value engine's normalization misleadingly high for them,
  // and real draft strategy treats them as late, need-driven picks regardless of "value".
  const skillPool = pool.filter((p) => SKILL_POSITIONS.includes(p.position));
  const bestAvailable = [...skillPool].sort((a, b) => (a.ranking?.overallRank ?? 999) - (b.ranking?.overallRank ?? 999))[0];
  const bestValue = [...skillPool].sort((a, b) => b.value.draftValue - a.value.draftValue)[0];
  const topRookie = rookieWatch.topRookies[0];
  const topSleeper = sleepers[0];
  const recommendedTargets = [...skillPool].sort((a, b) => b.value.overallValue - a.value.overallValue).slice(0, 8);
  const latestMock = mockDrafts[0];
  const strategy = recommendStrategies({
    teamCount: league.teamCount,
    draftPosition: Math.ceil(league.teamCount / 2),
    qbSlots: league.settings?.qbSlots ?? 1,
    superflexSlots: league.settings?.superflexSlots ?? 0,
    teSlots: league.settings?.teSlots ?? 1,
    tePremiumBonus: league.settings?.tePremiumBonus ?? 0,
    receptionPoints: league.settings?.receptionPoints ?? 0.5,
    benchSize: league.settings?.benchSize ?? 6,
  })[0]!;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.displayName}`}
        description={`${season.label} · ${league.name} · ${league.teamCount}-team ${league.scoringFormatPreset.replace("_", " ")}`}
        actions={
          <Button asChild>
            <Link href="/mock-draft">
              <Swords className="mr-1.5 h-4 w-4" /> Run a mock draft
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard
          label="My Draft Grade"
          value={latestMock?.overallGrade ?? "—"}
          subtext={latestMock ? `${latestMock.teamCount}-team mock` : "Run a mock draft"}
          icon={Trophy}
        />
        <MetricCard
          label="Best Available"
          value={bestAvailable ? `${bestAvailable.firstName[0]}. ${bestAvailable.lastName}` : "—"}
          subtext={bestAvailable ? `${bestAvailable.position} · Rank #${bestAvailable.ranking?.overallRank}` : undefined}
          icon={Users}
        />
        <MetricCard
          label="Top Rookie"
          value={topRookie ? `${topRookie.firstName[0]}. ${topRookie.lastName}` : "—"}
          subtext={topRookie ? `${topRookie.position} · Rd ${topRookie.rookieProfile?.draftRound}` : undefined}
          icon={Sparkles}
        />
        <MetricCard
          label="Best Sleeper"
          value={topSleeper ? `${topSleeper.player.firstName[0]}. ${topSleeper.player.lastName}` : "—"}
          subtext={topSleeper ? `Sleeper score ${topSleeper.sleeperScore.toFixed(0)}` : undefined}
          icon={Moon}
        />
        <MetricCard
          label="Biggest ADP Value"
          value={bestValue ? `${bestValue.firstName[0]}. ${bestValue.lastName}` : "—"}
          subtext={bestValue ? `Draft value ${bestValue.value.draftValue.toFixed(0)}` : undefined}
          icon={TrendingUp}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recommended Targets</CardTitle>
            <Link href="/players" className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all players <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommendedTargets.map((p) => (
              <Link
                key={p.id}
                href={`/players/${p.id}`}
                className="flex items-center gap-3 rounded-md border border-transparent px-2 py-2 text-sm hover:border-border hover:bg-muted/40"
              >
                <PositionBadge position={p.position} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {p.firstName} {p.lastName}
                </span>
                {p.isRookie ? <RookieBadge /> : null}
                <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">ADP {p.adp?.overallADP?.toFixed(1) ?? "-"}</span>
                <ValueIndicator score={p.value.overallValue} className="w-28 shrink-0" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Draft Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="mb-2">{strategy.strategy.replaceAll("_", " ")}</Badge>
            <p className="text-sm text-muted-foreground">{strategy.reasoning}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priorities</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {strategy.positionPriorities.slice(0, 4).map((pos, i) => (
                <PositionBadge key={`${pos}-${i}`} position={pos} />
              ))}
            </div>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="/draft-strategy">Full strategy breakdown</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rookie Watch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rookieWatch.breakoutCandidates.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <PositionBadge position={p.position} />
                <span className="min-w-0 flex-1 truncate">
                  {p.firstName} {p.lastName}
                </span>
                <span className="text-xs text-muted-foreground">{p.rookieProfile?.breakoutScore?.toFixed(0)}</span>
              </div>
            ))}
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/rookies">Open Rookie Watch</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ADP Movers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {adpMovers.risers.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <PositionBadge position={p.position} />
                <span className="min-w-0 flex-1 truncate">
                  {p.firstName} {p.lastName}
                </span>
                <span className="text-xs font-semibold text-emerald-400">{p.adp?.adpDelta?.toFixed(1)}</span>
              </div>
            ))}
            {adpMovers.risers.length === 0 ? <EmptyState title="No ADP movement yet" className="py-6" /> : null}
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/adp">Open ADP dashboard</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Position Tiers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tierBoard
              .filter((g) => g.position !== "K" && g.position !== "DST")
              .map((g) => (
                <div key={g.position} className="flex items-center gap-2 text-sm">
                  <PositionBadge position={g.position} />
                  <span className="text-muted-foreground">{g.tiers.length} tiers</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Tier 1: {g.tiers[0]?.players.length ?? 0} players
                  </span>
                </div>
              ))}
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/tiers">Open tier board</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Mock Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            {mockDrafts.length === 0 ? (
              <EmptyState
                icon={Swords}
                title="No mock drafts yet"
                description="Run your first mock draft to see grades and results here."
                action={
                  <Button asChild size="sm">
                    <Link href="/mock-draft">Start a mock draft</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {mockDrafts.slice(0, 6).map((m) => (
                  <Link
                    key={m.id}
                    href={`/mock-draft/${m.id}`}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <div>
                      <p className="font-medium">
                        {m.teamCount}-team, pick {m.draftPosition}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline">{m.overallGrade}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
