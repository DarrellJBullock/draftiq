"use client";

import { useTransition } from "react";
import { X, ArrowRightLeft } from "lucide-react";
import type { Position, ScoringFormatPreset } from "@prisma/client";
import type { PlayerWithContext } from "@/types";
import type { StarterSlotDef } from "@/lib/team-builder/analysis";
import { addPlayerAction, removePlayerAction, movePlayerAction } from "./actions";
import { PlayerPicker } from "@/components/shared/player-picker";
import { PositionBadge } from "@/components/shared/position-badge";
import { RookieBadge } from "@/components/shared/rookie-badge";
import { DdaflAdjustmentBadge } from "@/components/shared/ddafl-adjustment-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RosterRow {
  slot: string;
  player: PlayerWithContext;
}

export function StarterSlotRow({
  slot,
  player,
  season,
  scoringFormat,
  rosteredIds,
  ddaflAdjustment,
}: {
  slot: StarterSlotDef;
  player: PlayerWithContext | null;
  season: number;
  scoringFormat: ScoringFormatPreset;
  rosteredIds: string[];
  ddaflAdjustment?: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
      <span className="w-16 shrink-0 text-xs font-bold uppercase tracking-wide text-muted-foreground">{slot.id}</span>
      {player ? (
        <>
          <PositionBadge position={player.position} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {player.firstName} {player.lastName}
          </span>
          {player.isRookie ? <RookieBadge /> : null}
          <span className="shrink-0 text-xs text-muted-foreground">{player.nflTeam?.abbreviation ?? "FA"}</span>
          {ddaflAdjustment !== undefined ? (
            <span className="hidden w-10 shrink-0 text-right text-xs tabular-nums sm:inline">
              <DdaflAdjustmentBadge adjustment={ddaflAdjustment} />
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            disabled={pending}
            onClick={() => startTransition(() => removePlayerAction(player.id))}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-xs text-muted-foreground">Empty &middot; {slot.positions.join("/")}</span>
          <PlayerPicker
            season={season}
            scoringFormat={scoringFormat}
            eligiblePositions={slot.positions}
            excludeIds={rosteredIds}
            triggerLabel="Add"
            onSelect={(p) => startTransition(() => addPlayerAction(p.id, slot.id))}
          />
        </>
      )}
    </div>
  );
}

export function BenchRow({
  row,
  emptyStarterSlots,
  ddaflAdjustment,
}: {
  row: RosterRow;
  emptyStarterSlots: StarterSlotDef[];
  ddaflAdjustment?: number;
}) {
  const [pending, startTransition] = useTransition();
  const { player } = row;
  const eligibleSlots = emptyStarterSlots.filter((s) => s.positions.includes(player.position));

  return (
    <div className="flex items-center gap-3 rounded-md border border-transparent px-3 py-2 hover:border-border hover:bg-muted/30">
      <PositionBadge position={player.position} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {player.firstName} {player.lastName}
      </span>
      {player.isRookie ? <RookieBadge /> : null}
      <span className="shrink-0 text-xs text-muted-foreground">{player.nflTeam?.abbreviation ?? "FA"}</span>
      {ddaflAdjustment !== undefined ? (
        <span className="hidden w-10 shrink-0 text-right text-xs tabular-nums sm:inline">
          <DdaflAdjustmentBadge adjustment={ddaflAdjustment} />
        </span>
      ) : null}
      {eligibleSlots.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={pending}>
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {eligibleSlots.map((s) => (
              <DropdownMenuItem key={s.id} onClick={() => startTransition(() => movePlayerAction(player.id, s.id))}>
                Move to {s.id}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        disabled={pending}
        onClick={() => startTransition(() => removePlayerAction(player.id))}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function AddToBenchButton({
  season,
  scoringFormat,
  excludeIds,
}: {
  season: number;
  scoringFormat: ScoringFormatPreset;
  excludeIds: string[];
}) {
  const [, startTransition] = useTransition();
  return (
    <PlayerPicker
      season={season}
      scoringFormat={scoringFormat}
      excludeIds={excludeIds}
      triggerLabel="Add to bench"
      onSelect={(p) => startTransition(() => addPlayerAction(p.id, "BENCH"))}
    />
  );
}

export type { Position };
