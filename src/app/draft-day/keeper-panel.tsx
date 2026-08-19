"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import type { Position, ScoringFormatPreset } from "@prisma/client";
import type { PlayerWithContext } from "@/types";
import { PlayerPicker } from "@/components/shared/player-picker";
import { PositionBadge } from "@/components/shared/position-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface KeeperRow {
  id: string;
  teamSlot: number;
  isUserPick: boolean;
  player: { id: string; firstName: string; lastName: string; position: Position } | null;
}

export function KeeperPanel({
  draftId,
  teamCount,
  season,
  scoringFormat,
  keepers,
}: {
  draftId: string;
  teamCount: number;
  season: number;
  scoringFormat: ScoringFormatPreset;
  keepers: KeeperRow[];
}) {
  const router = useRouter();
  const [teamSlot, setTeamSlot] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const excludeIds = keepers.map((k) => k.player?.id).filter((id): id is string => !!id);

  function addKeeper(player: PlayerWithContext) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/draft/keeper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, playerId: player.id, teamSlot }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to add keeper");
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card className="mb-4 border-border/70">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Users className="h-4 w-4 text-primary" /> Keepers
        </CardTitle>
        <p className="text-xs text-muted-foreground">Pre-assign a player kept from last season -- they&apos;re removed from the board but don&apos;t cost that team a normal pick.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {keepers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {keepers.map((k) => (
              <Badge key={k.id} variant="outline" className="gap-1.5">
                Team {k.teamSlot}
                {k.isUserPick ? " (You)" : ""}:{" "}
                {k.player ? (
                  <>
                    <PositionBadge position={k.player.position} className="h-4 min-w-6 px-1 text-[10px]" />
                    {k.player.firstName} {k.player.lastName}
                  </>
                ) : (
                  "Unknown"
                )}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Team slot</label>
            <select
              value={teamSlot}
              onChange={(e) => setTeamSlot(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              {Array.from({ length: teamCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Team {n}
                </option>
              ))}
            </select>
          </div>
          <PlayerPicker season={season} scoringFormat={scoringFormat} excludeIds={excludeIds} onSelect={addKeeper} triggerLabel="Add keeper" />
          {pending ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>
        {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
