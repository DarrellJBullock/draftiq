"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Radio, Search, Sparkles } from "lucide-react";
import type { Position, ScoringFormatPreset } from "@prisma/client";
import type { PlayerWithContext } from "@/types";
import { PositionBadge } from "@/components/shared/position-badge";
import { RookieBadge } from "@/components/shared/rookie-badge";
import { ValueIndicator } from "@/components/shared/value-indicator";
import { DdaflAdjustmentBadge } from "@/components/shared/ddafl-adjustment-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export interface AvailablePlayer extends PlayerWithContext {
  overallValue: number;
  draftValue: number;
  riskAdjustedValue: number;
  upsideScore: number;
  sleeperScore: number;
  /** Estimated multiplier for DDAFL's distance-tiered scoring bonuses -- 1 means no adjustment. */
  ddaflAdjustment: number;
}

type QuickFilter = "BEST_AVAILABLE" | "BEST_VALUE" | "ROOKIE" | "SLEEPER" | "SAFE" | "UPSIDE" | Position;

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: "BEST_AVAILABLE", label: "Best Available" },
  { value: "BEST_VALUE", label: "Best Value" },
  { value: "QB", label: "QB" },
  { value: "RB", label: "RB" },
  { value: "WR", label: "WR" },
  { value: "TE", label: "TE" },
  { value: "ROOKIE", label: "Rookie" },
  { value: "SLEEPER", label: "Sleeper" },
  { value: "SAFE", label: "Safe Pick" },
  { value: "UPSIDE", label: "High Upside" },
];

interface WhoShouldIDraftResult {
  playerId: string;
  recommendation: string;
  valueScore: number;
  needScore: number;
  riskScore: number;
  upside: number;
  alternatives: { id: string; name: string; position: Position; value: { overallValue: number } }[];
}

export function DraftDayBoard({
  draftId,
  season,
  scoringFormat,
  currentRound,
  currentPick,
  userDraftPosition,
  onTheClock,
  players,
  positionNeeds,
  showDdaflAdjustment = false,
}: {
  draftId: string;
  season: number;
  scoringFormat: ScoringFormatPreset;
  currentRound: number;
  currentPick: number;
  userDraftPosition: number;
  onTheClock: number;
  players: AvailablePlayer[];
  positionNeeds: { position: Position; have: number; need: number }[];
  showDdaflAdjustment?: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<QuickFilter>("BEST_AVAILABLE");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusResult, setFocusResult] = useState<WhoShouldIDraftResult | null>(null);
  const [focusLoading, setFocusLoading] = useState(false);

  const filtered = useMemo(() => {
    let list = players;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q));
    }
    switch (filter) {
      case "BEST_AVAILABLE":
        return [...list].sort((a, b) => (a.ranking?.overallRank ?? 999) - (b.ranking?.overallRank ?? 999));
      case "BEST_VALUE":
        return [...list].sort((a, b) => b.draftValue - a.draftValue);
      case "ROOKIE":
        return list.filter((p) => p.isRookie).sort((a, b) => b.overallValue - a.overallValue);
      case "SLEEPER":
        return [...list].sort((a, b) => b.sleeperScore - a.sleeperScore);
      case "SAFE":
        return list.filter((p) => p.playerSeason?.riskLevel === "LOW").sort((a, b) => b.riskAdjustedValue - a.riskAdjustedValue);
      case "UPSIDE":
        return [...list].sort((a, b) => b.upsideScore - a.upsideScore);
      case "QB":
      case "RB":
      case "WR":
      case "TE":
        return list.filter((p) => p.position === filter).sort((a, b) => (a.ranking?.overallRank ?? 999) - (b.ranking?.overallRank ?? 999));
      default:
        return list;
    }
  }, [players, filter, search]);

  function draftPlayer(playerId: string) {
    startTransition(async () => {
      const res = await fetch("/api/draft/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, playerId }),
      });
      if (res.ok) router.refresh();
    });
  }

  function whoShouldIDraft(playerId: string) {
    setFocusId(playerId);
    setFocusLoading(true);
    setFocusResult(null);
    const params = new URLSearchParams({
      season: String(season),
      scoringFormat,
      focusPlayerId: playerId,
      draftedPlayerIds: "",
    });
    fetch(`/api/draft/recommendations?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setFocusResult(data.whoShouldIDraft))
      .finally(() => setFocusLoading(false));
  }

  const userIsOnClock = onTheClock === userDraftPosition;

  return (
    <div>
      <Card className={cn("mb-4 border-border/70", userIsOnClock && "border-primary/50 bg-primary/5")}>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2">
            <Radio className={cn("h-4 w-4", userIsOnClock ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm font-semibold">
              Round {currentRound} &middot; Pick {currentPick}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {userIsOnClock ? "You're on the clock" : `Team ${onTheClock} is on the clock`}
          </span>
          <Badge variant="outline" className="ml-auto">
            Your slot: {userDraftPosition}
          </Badge>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {positionNeeds.map((n) => (
          <Badge key={n.position} variant={n.have < n.need ? "default" : "outline"} className="gap-1">
            {n.position} {n.have}/{n.need}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search available players..." className="h-8 pl-8 text-sm" />
            </div>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-semibold",
                  filter === f.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No players match this filter" className="py-10" />
          ) : (
            <div className="space-y-1.5">
              {filtered.slice(0, 40).map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm hover:bg-muted/30">
                  <PositionBadge position={p.position} />
                  <button onClick={() => whoShouldIDraft(p.id)} className="min-w-0 flex-1 truncate text-left font-medium hover:text-primary hover:underline">
                    {p.firstName} {p.lastName}
                  </button>
                  {p.isRookie ? <RookieBadge /> : null}
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{p.nflTeam?.abbreviation ?? "FA"}</span>
                  <span className="hidden w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:inline">
                    ADP {p.adp?.overallADP?.toFixed(1) ?? "-"}
                  </span>
                  {showDdaflAdjustment ? (
                    <span className="hidden w-12 shrink-0 text-right text-xs tabular-nums lg:inline">
                      <DdaflAdjustmentBadge adjustment={p.ddaflAdjustment} />
                    </span>
                  ) : null}
                  <ValueIndicator score={p.overallValue} className="hidden w-24 shrink-0 md:flex" />
                  <Button size="sm" disabled={pending} onClick={() => draftPlayer(p.id)} className="h-7 shrink-0 px-2.5 text-xs">
                    {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Draft"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <Sparkles className="h-4 w-4 text-primary" /> Who Should I Draft?
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!focusId ? (
                <p className="text-xs text-muted-foreground">Click any player name to see a full recommendation breakdown.</p>
              ) : focusLoading ? (
                <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing...
                </div>
              ) : focusResult ? (
                <div className="space-y-3">
                  <Badge className="text-xs">{focusResult.recommendation}</Badge>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Metric label="Value" value={focusResult.valueScore} />
                    <Metric label="Need" value={focusResult.needScore} />
                    <Metric label="Risk" value={focusResult.riskScore} />
                    <Metric label="Upside" value={focusResult.upside} />
                  </div>
                  {focusResult.alternatives.length > 0 ? (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alternatives</p>
                      <div className="space-y-1">
                        {focusResult.alternatives.map((a) => (
                          <div key={a.id} className="flex items-center gap-1.5 text-xs">
                            <PositionBadge position={a.position} className="h-4 min-w-6 px-1 text-[10px]" />
                            <span className="flex-1 truncate">{a.name}</span>
                            <span className="text-muted-foreground">{a.value.overallValue.toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No data available for this player.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1.5">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value.toFixed(0)}</p>
    </div>
  );
}
