"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, X, Loader2 } from "lucide-react";
import type { ScoringFormatPreset } from "@prisma/client";
import type { PlayerWithContext } from "@/types";
import { PlayerPicker } from "@/components/shared/player-picker";
import { PositionBadge } from "@/components/shared/position-badge";
import { RookieBadge } from "@/components/shared/rookie-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";

interface TradeAnalyzeResponse {
  result: {
    sideA: { totalValue: number; positionBreakdown: Record<string, number> };
    sideB: { totalValue: number; positionBreakdown: Record<string, number> };
    winner: "A" | "B" | "even";
    gradeA: string;
    gradeB: string;
    explanation: string;
  };
  trade: { riskNotes: string | null; upsideNotes: string | null };
}

function TradeSide({
  label,
  players,
  onAdd,
  onRemove,
  season,
  scoringFormat,
  excludeIds,
}: {
  label: string;
  players: PlayerWithContext[];
  onAdd: (p: PlayerWithContext) => void;
  onRemove: (id: string) => void;
  season: number;
  scoringFormat: ScoringFormatPreset;
  excludeIds: string[];
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">{label}</CardTitle>
        <PlayerPicker season={season} scoringFormat={scoringFormat} excludeIds={excludeIds} onSelect={onAdd} triggerLabel="Add player" />
      </CardHeader>
      <CardContent className="space-y-2">
        {players.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No players added yet.</p>
        ) : (
          players.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm">
              <PositionBadge position={p.position} />
              <span className="min-w-0 flex-1 truncate font-medium">
                {p.firstName} {p.lastName}
              </span>
              {p.isRookie ? <RookieBadge /> : null}
              <span className="shrink-0 text-xs text-muted-foreground">ADP {p.adp?.overallADP?.toFixed(1) ?? "-"}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onRemove(p.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function TradeWorkbench({ season, scoringFormat, leagueId }: { season: number; scoringFormat: ScoringFormatPreset; leagueId: string }) {
  const [sideA, setSideA] = useState<PlayerWithContext[]>([]);
  const [sideB, setSideB] = useState<PlayerWithContext[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<TradeAnalyzeResponse | null>(null);

  const excludeIds = useMemo(() => [...sideA, ...sideB].map((p) => p.id), [sideA, sideB]);

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trade/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season,
          scoringFormat,
          leagueId,
          sideAPlayerIds: sideA.map((p) => p.id),
          sideBPlayerIds: sideB.map((p) => p.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to analyze trade");
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze trade");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TradeSide label="Side A" players={sideA} onAdd={(p) => setSideA((s) => [...s, p])} onRemove={(id) => setSideA((s) => s.filter((p) => p.id !== id))} season={season} scoringFormat={scoringFormat} excludeIds={excludeIds} />
        <TradeSide label="Side B" players={sideB} onAdd={(p) => setSideB((s) => [...s, p])} onRemove={(id) => setSideB((s) => s.filter((p) => p.id !== id))} season={season} scoringFormat={scoringFormat} excludeIds={excludeIds} />
      </div>

      <div className="mt-4 flex items-center justify-center">
        <Button onClick={analyze} disabled={loading || sideA.length === 0 || sideB.length === 0} size="lg" className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
          Analyze Trade
        </Button>
      </div>

      {error ? <p className="mt-3 text-center text-sm text-rose-400">{error}</p> : null}

      <div className="mt-6">
        {!response ? (
          <EmptyState icon={ArrowLeftRight} title="Add players to both sides, then analyze" description="The value engine compares total draft value, position breakdown, and risk on each side." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className={response.result.winner === "A" ? "border-emerald-500/40" : "border-border/70"}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  Side A <Badge>{response.result.gradeA}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{response.result.sideA.totalValue}</p>
                <p className="text-xs text-muted-foreground">total value</p>
              </CardContent>
            </Card>
            <Card className="flex items-center justify-center border-border/70">
              <CardContent className="p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Winner</p>
                <p className="mt-1 text-xl font-bold">{response.result.winner === "even" ? "Fair trade" : `Side ${response.result.winner}`}</p>
              </CardContent>
            </Card>
            <Card className={response.result.winner === "B" ? "border-emerald-500/40" : "border-border/70"}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  Side B <Badge>{response.result.gradeB}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{response.result.sideB.totalValue}</p>
                <p className="text-xs text-muted-foreground">total value</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-3 border-border/70">
              <CardContent className="space-y-2 p-4 text-sm">
                <p>{response.result.explanation}</p>
                {response.trade.riskNotes ? <p className="text-rose-400">{response.trade.riskNotes}</p> : null}
                {response.trade.upsideNotes ? <p className="text-emerald-400">{response.trade.upsideNotes}</p> : null}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
