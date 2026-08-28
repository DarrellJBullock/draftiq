import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { getRookieWatch } from "@/lib/queries/rookie-watch";
import { getRookiePool } from "@/lib/queries/players";
import { getValuedPlayerPool } from "@/lib/queries/value-pool";
import { calculateDdaflAdjustment, computePositionAverageYPT } from "@/lib/services/scoring/ddafl-adjustment";
import { rookieQuerySchema } from "@/lib/validation/player";
import { POSITIONS } from "@/types";
import type { PlayerWithContext } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { RookieCard } from "@/components/shared/rookie-card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

const ROOKIE_POSITIONS = POSITIONS.filter((p) => p !== "K" && p !== "DST");

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "overallFantasyRank", label: "Rookie rank" },
  { value: "breakoutScore", label: "Breakout score" },
  { value: "opportunityScore", label: "Opportunity score" },
  { value: "adp", label: "ADP" },
];

function Section({
  title,
  description,
  players,
  emptyText,
  render,
}: {
  title: string;
  description: string;
  players: PlayerWithContext[];
  emptyText: string;
  render: (player: PlayerWithContext) => React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {players.length === 0 ? (
        <EmptyState title={emptyText} className="py-8" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {players.map((p) => (
            <div key={p.id}>{render(p)}</div>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function RookiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const query = rookieQuerySchema.parse(rawParams);

  const [season, user] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo()]);
  const league = await getOrCreateDefaultLeague(user.id);

  const [watch, pool] = await Promise.all([
    getRookieWatch(season.id, season.year),
    getRookiePool(season.id, season.year, { ...query, pageSize: 24 }),
  ]);

  const showDdaflAdjustment = !!league.mflLeagueId;
  const positionAverageYPT = new Map<string, number | null>();
  if (showDdaflAdjustment) {
    const valuePool = await getValuedPlayerPool(season.id, league.scoringFormatPreset);
    const inputs = valuePool.map((p) => ({
      position: p.position,
      rushAttempts: p.projection?.rushAttempts,
      rushingYards: p.projection?.rushingYards,
      receptions: p.projection?.receptions,
      receivingYards: p.projection?.receivingYards,
      attempts: p.projection?.attempts,
      passingYards: p.projection?.passingYards,
    }));
    for (const pos of POSITIONS) positionAverageYPT.set(pos, computePositionAverageYPT(inputs, pos));
  }
  const ddaflFor = (p: PlayerWithContext) =>
    calculateDdaflAdjustment(
      {
        position: p.position,
        rushAttempts: p.projection?.rushAttempts,
        rushingYards: p.projection?.rushingYards,
        receptions: p.projection?.receptions,
        receivingYards: p.projection?.receivingYards,
        attempts: p.projection?.attempts,
        passingYards: p.projection?.passingYards,
      },
      positionAverageYPT.get(p.position) ?? null
    );

  const activePosition = query.position ?? "ALL";
  const activeSort = query.sortBy;

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (activePosition !== "ALL" && overrides.position === undefined) params.set("position", activePosition);
    if (activeSort && overrides.sortBy === undefined) params.set("sortBy", activeSort);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === "ALL") params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/rookies?${qs}` : "/rookies";
  };

  return (
    <div>
      <PageHeader
        title="Rookie Watch"
        description={`${season.label} draft class · scouting rookies by draft capital, opportunity, and landing spot`}
      />

      {showDdaflAdjustment ? (
        <p className="mb-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">DDAFL</span> is an estimated adjustment for your league&apos;s
          distance-tiered scoring bonuses, based on yards-per-touch efficiency -- not an exact calculation, since real
          per-play distance data isn&apos;t available from season projections.
        </p>
      ) : null}

      <Section
        title="Top Rookies"
        description="The highest-ranked rookies for fantasy purposes overall."
        players={watch.topRookies}
        emptyText="No rookie rankings yet"
        render={(p) => <RookieCard player={p} ddaflAdjustment={showDdaflAdjustment ? ddaflFor(p) : undefined} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section
          title="Biggest Risers"
          description="Rookies whose ADP has climbed the most."
          players={watch.biggestRisers}
          emptyText="No ADP movement data yet"
          render={(p) => (
            <RookieCard
              player={p}
              ddaflAdjustment={showDdaflAdjustment ? ddaflFor(p) : undefined}
              footer={
                <span className="font-semibold text-emerald-400">
                  ADP {p.adp?.adpDelta && p.adp.adpDelta > 0 ? "+" : ""}
                  {p.adp?.adpDelta?.toFixed(1)}
                </span>
              }
            />
          )}
        />

        <Section
          title="Biggest Fallers"
          description="Rookies whose ADP has dropped the most."
          players={watch.biggestFallers}
          emptyText="No ADP movement data yet"
          render={(p) => (
            <RookieCard
              player={p}
              ddaflAdjustment={showDdaflAdjustment ? ddaflFor(p) : undefined}
              footer={
                <span className="font-semibold text-rose-400">
                  ADP {p.adp?.adpDelta && p.adp.adpDelta > 0 ? "+" : ""}
                  {p.adp?.adpDelta?.toFixed(1)}
                </span>
              }
            />
          )}
        />
      </div>

      <Section
        title="Best Rookie Landing Spots"
        description="Rookies whose team/scheme situation sets them up for early fantasy relevance."
        players={watch.bestLandingSpots}
        emptyText="No landing spot data yet"
        render={(p) => (
          <RookieCard player={p} highlight={{ label: "Landing Spot", score: p.rookieProfile?.landingSpotScore ?? 0 }} ddaflAdjustment={showDdaflAdjustment ? ddaflFor(p) : undefined} />
        )}
      />

      <Section
        title="Best Rookie Values"
        description="Rookies going later in drafts than their projected rookie rank suggests they should."
        players={watch.bestValues}
        emptyText="No value data yet"
        render={(p) => (
          <RookieCard
            player={p}
            ddaflAdjustment={showDdaflAdjustment ? ddaflFor(p) : undefined}
            footer={
              <span>
                ADP {p.adp?.overallADP?.toFixed(1) ?? "-"} vs Rookie Rank #{p.rookieProfile?.overallFantasyRank ?? "-"}
              </span>
            }
          />
        )}
      />

      <Section
        title="Rookie Sleepers"
        description="High-opportunity rookies still sitting outside the top 20 overall rookie rank."
        players={watch.sleepers}
        emptyText="No sleeper candidates identified this class"
        render={(p) => (
          <RookieCard player={p} highlight={{ label: "Opportunity", score: p.rookieProfile?.opportunityScore ?? 0 }} ddaflAdjustment={showDdaflAdjustment ? ddaflFor(p) : undefined} />
        )}
      />

      <Section
        title="Rookie Red Flags"
        description="Rookies facing steep depth-chart competition that could cap their fantasy ceiling."
        players={watch.redFlags}
        emptyText="No major red flags identified this class"
        render={(p) => (
          <RookieCard player={p} highlight={{ label: "Competition Risk", score: p.rookieProfile?.competitionScore ?? 0 }} ddaflAdjustment={showDdaflAdjustment ? ddaflFor(p) : undefined} />
        )}
      />

      <Section
        title="Rookie Breakout Candidates"
        description="Rookies with the highest breakout scores for a leap in fantasy value."
        players={watch.breakoutCandidates}
        emptyText="No breakout candidates identified this class"
        render={(p) => (
          <RookieCard player={p} highlight={{ label: "Breakout", score: p.rookieProfile?.breakoutScore ?? 0 }} ddaflAdjustment={showDdaflAdjustment ? ddaflFor(p) : undefined} />
        )}
      />

      <section className="mt-8 border-t border-border pt-6">
        <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Full Rookie Rankings</h2>
            <p className="text-sm text-muted-foreground">Browse the entire {season.year} rookie class by position.</p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={buildHref({ position: "ALL" })}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-semibold",
                activePosition === "ALL" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"
              )}
            >
              All
            </Link>
            {ROOKIE_POSITIONS.map((pos) => (
              <Link
                key={pos}
                href={buildHref({ position: pos })}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-semibold",
                  activePosition === pos ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"
                )}
              >
                {pos}
              </Link>
            ))}
          </div>
          <span className="mx-1 h-4 w-px bg-border" />
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={buildHref({ sortBy: opt.value })}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-semibold",
                  activeSort === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"
                )}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>

        {pool.players.length === 0 ? (
          <EmptyState icon={Sparkles} title="No rookies match this filter" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pool.players.map((p) => (
              <RookieCard key={p.id} player={p} ddaflAdjustment={showDdaflAdjustment ? ddaflFor(p) : undefined} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
