import type { Metadata } from "next";
import { TrendingDown, TrendingUp, Users, Gem } from "lucide-react";
import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { getADPBoard, getBiggestADPMovers } from "@/lib/queries/adp";
import { calculateDdaflAdjustment, computePositionAverageYPT } from "@/lib/services/scoring/ddafl-adjustment";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { PositionBadge } from "@/components/shared/position-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ADPChart } from "@/components/shared/adp-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ADPBoard, type ADPBoardRow } from "./adp-board";
import { POSITIONS } from "@/types";

export const metadata: Metadata = { title: "ADP" };

/** Spots of divergence between rank and ADP before we flag a player as a steal/reach candidate. */
const FLAG_THRESHOLD = 8;

export default async function ADPPage() {
  const [season, user] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo()]);
  const league = await getOrCreateDefaultLeague(user.id);

  const [board, movers] = await Promise.all([
    getADPBoard(season.id, league.scoringFormatPreset, 300),
    getBiggestADPMovers(season.id, league.scoringFormatPreset, 8),
  ]);

  const showDdaflAdjustment = !!league.mflLeagueId;
  const ddaflInputs = board.map((p) => ({
    position: p.position,
    rushAttempts: p.projection?.rushAttempts,
    rushingYards: p.projection?.rushingYards,
    receptions: p.projection?.receptions,
    receivingYards: p.projection?.receivingYards,
    attempts: p.projection?.attempts,
    passingYards: p.projection?.passingYards,
  }));
  const positionAverageYPTCache = new Map(POSITIONS.map((pos) => [pos, computePositionAverageYPT(ddaflInputs, pos)]));

  const rows: ADPBoardRow[] = board.map((p, i) => {
    const rank = p.expertRanking?.overallRank ?? p.consensusRanking?.overallRank ?? null;
    const diff = p.adp?.overallADP != null && rank != null ? p.adp.overallADP - rank : null;
    const flag = diff == null ? null : diff >= FLAG_THRESHOLD ? "STEAL" : diff <= -FLAG_THRESHOLD ? "REACH" : null;
    const ddaflAdjustment = calculateDdaflAdjustment(ddaflInputs[i]!, positionAverageYPTCache.get(p.position) ?? null);
    return { ...p, flag, ddaflAdjustment };
  });

  const steals = rows
    .filter((r) => r.flag === "STEAL")
    .sort((a, b) => (b.adp!.overallADP - (b.expertRanking?.overallRank ?? b.consensusRanking?.overallRank ?? 0)) - (a.adp!.overallADP - (a.expertRanking?.overallRank ?? a.consensusRanking?.overallRank ?? 0)))
    .slice(0, 8);
  const reaches = rows
    .filter((r) => r.flag === "REACH")
    .sort((a, b) => (a.adp!.overallADP - (a.expertRanking?.overallRank ?? a.consensusRanking?.overallRank ?? 0)) - (b.adp!.overallADP - (b.expertRanking?.overallRank ?? b.consensusRanking?.overallRank ?? 0)))
    .slice(0, 8);

  const chartData = board.slice(0, 30).map((p) => ({
    id: p.id,
    name: `${p.firstName[0]}. ${p.lastName}`,
    position: p.position,
    adp: Math.round((p.adp?.overallADP ?? 0) * 10) / 10,
    expertRank: p.expertRanking?.overallRank ?? null,
    consensusRank: p.consensusRanking?.overallRank ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="ADP"
        description={`${season.label} · ${league.scoringFormatPreset.replace("_", " ")} · average draft position analysis`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Players Tracked" value={String(board.length)} icon={Users} />
        <MetricCard
          label="Biggest Riser"
          value={movers.risers[0] ? `${movers.risers[0].firstName[0]}. ${movers.risers[0].lastName}` : "—"}
          subtext={movers.risers[0]?.adp?.adpDelta != null ? `${movers.risers[0].adp!.adpDelta!.toFixed(1)} ADP` : undefined}
          icon={TrendingUp}
          accent="text-emerald-400"
        />
        <MetricCard
          label="Biggest Faller"
          value={movers.fallers[0] ? `${movers.fallers[0].firstName[0]}. ${movers.fallers[0].lastName}` : "—"}
          subtext={movers.fallers[0]?.adp?.adpDelta != null ? `+${movers.fallers[0].adp!.adpDelta!.toFixed(1)} ADP` : undefined}
          icon={TrendingDown}
          accent="text-rose-400"
        />
        <MetricCard label="Steal Candidates" value={String(steals.length)} subtext={`${FLAG_THRESHOLD}+ spots of value`} icon={Gem} />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">ADP vs. Expert vs. Consensus Rank</CardTitle>
          <p className="text-xs text-muted-foreground">Top 30 players by ADP. Lower is better on every series.</p>
        </CardHeader>
        <CardContent>
          <ADPChart data={chartData} />
        </CardContent>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ADP Movers</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">Risers</p>
              <div className="space-y-2">
                {movers.risers.length === 0 ? (
                  <EmptyState title="No risers yet" className="py-6" />
                ) : (
                  movers.risers.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-sm">
                      <PositionBadge position={p.position} />
                      <span className="min-w-0 flex-1 truncate">
                        {p.firstName} {p.lastName}
                      </span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-emerald-400">
                        {p.adp?.adpDelta?.toFixed(1)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-400">Fallers</p>
              <div className="space-y-2">
                {movers.fallers.length === 0 ? (
                  <EmptyState title="No fallers yet" className="py-6" />
                ) : (
                  movers.fallers.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-sm">
                      <PositionBadge position={p.position} />
                      <span className="min-w-0 flex-1 truncate">
                        {p.firstName} {p.lastName}
                      </span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-rose-400">
                        +{p.adp?.adpDelta?.toFixed(1)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Steal &amp; Reach Candidates</CardTitle>
            <p className="text-xs text-muted-foreground">Rank vs. ADP diverges by {FLAG_THRESHOLD}+ spots</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">Steals (value)</p>
              <div className="space-y-2">
                {steals.length === 0 ? (
                  <EmptyState title="No steal candidates" className="py-6" />
                ) : (
                  steals.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-sm">
                      <PositionBadge position={p.position} />
                      <span className="min-w-0 flex-1 truncate">
                        {p.firstName} {p.lastName}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">ADP {p.adp?.overallADP?.toFixed(1)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-400">Reaches (risk)</p>
              <div className="space-y-2">
                {reaches.length === 0 ? (
                  <EmptyState title="No reach candidates" className="py-6" />
                ) : (
                  reaches.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-sm">
                      <PositionBadge position={p.position} />
                      <span className="min-w-0 flex-1 truncate">
                        {p.firstName} {p.lastName}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">ADP {p.adp?.overallADP?.toFixed(1)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Overall &amp; Position ADP</CardTitle>
          {showDdaflAdjustment ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">DDAFL Est.</span> is an estimated adjustment for your league&apos;s
              distance-tiered scoring bonuses, based on yards-per-touch efficiency -- not an exact calculation, since real
              per-play distance data isn&apos;t available from season projections.
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          <ADPBoard rows={rows} showDdaflAdjustment={showDdaflAdjustment} />
        </CardContent>
      </Card>
    </div>
  );
}
