"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import type { Position, ScoringFormatPreset } from "@prisma/client";
import type { PlayerWithContext } from "@/types";
import { PlayerPicker } from "@/components/shared/player-picker";
import { PositionBadge } from "@/components/shared/position-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface UnmatchedPick {
  round: number;
  pickInRound: number;
  teamSlot: number;
  mflFirstName: string;
  mflLastName: string;
  mflPosition: Position | null;
}

export function MflSyncPanel({ draftId, season, scoringFormat }: { draftId: string; season: number; scoringFormat: ScoringFormatPreset }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unmatched, setUnmatched] = useState<UnmatchedPick[]>([]);

  function sync() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/draft/sync-mfl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sync failed");
        setMessage(null);
        return;
      }
      setUnmatched(data.unmatched ?? []);
      setMessage(
        `Synced ${data.syncedCount} pick${data.syncedCount === 1 ? "" : "s"}.` +
          (data.unmatched?.length ? ` ${data.unmatched.length} need a manual match below.` : "")
      );
      router.refresh();
    });
  }

  function resolve(pick: UnmatchedPick, player: PlayerWithContext) {
    startTransition(async () => {
      const res = await fetch("/api/draft/sync-mfl/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, round: pick.round, pickInRound: pick.pickInRound, teamSlot: pick.teamSlot, playerId: player.id }),
      });
      if (res.ok) {
        setUnmatched((prev) => prev.filter((p) => !(p.round === pick.round && p.pickInRound === pick.pickInRound)));
        router.refresh();
      }
    });
  }

  function dismiss(pick: UnmatchedPick) {
    setUnmatched((prev) => prev.filter((p) => !(p.round === pick.round && p.pickInRound === pick.pickInRound)));
  }

  return (
    <Card className="mb-4 border-border/70">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">MyFantasyLeague Sync</p>
            <p className="text-xs text-muted-foreground">Pull in picks made in your real MFL draft room.</p>
          </div>
          <Button onClick={sync} disabled={pending} size="sm" variant="outline" className="gap-2">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync from MFL
          </Button>
        </div>

        {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
        {message && !error ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}

        {unmatched.length > 0 ? (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Needs a manual match</p>
            {unmatched.map((pick) => (
              <div key={`${pick.round}-${pick.pickInRound}`} className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border p-2 text-sm">
                <span className="text-xs tabular-nums text-muted-foreground">
                  Rd {pick.round}.{String(pick.pickInRound).padStart(2, "0")} &middot; Team {pick.teamSlot}
                </span>
                {pick.mflPosition ? <PositionBadge position={pick.mflPosition} className="h-4 min-w-6 px-1 text-[10px]" /> : null}
                <span className="font-medium">
                  MFL: {pick.mflFirstName} {pick.mflLastName}
                </span>
                <PlayerPicker season={season} scoringFormat={scoringFormat} onSelect={(player) => resolve(pick, player)} triggerLabel="Match player" />
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => dismiss(pick)}>
                  Dismiss
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
