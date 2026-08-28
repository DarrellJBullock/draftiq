import { Moon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PositionBadge } from "./position-badge";
import { RookieBadge } from "./rookie-badge";
import { ValueIndicator } from "./value-indicator";
import { DdaflAdjustmentBadge } from "./ddafl-adjustment-badge";
import type { PlayerWithContext } from "@/types";

export interface SleeperCardData {
  player: PlayerWithContext;
  sleeperScore: number;
  reasons: string[];
  idealDraftRangeStart: number;
  idealDraftRangeEnd: number;
  /** Estimated multiplier for DDAFL's distance-tiered scoring bonuses -- 1 means no adjustment. */
  ddaflAdjustment?: number;
}

/** Card summarizing why a player is undervalued relative to their ADP. */
export function SleeperCard({ sleeper, showDdaflAdjustment = false }: { sleeper: SleeperCardData; showDdaflAdjustment?: boolean }) {
  const { player } = sleeper;

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold">
              {player.firstName} {player.lastName}
            </p>
            {player.isRookie ? <RookieBadge /> : null}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <PositionBadge position={player.position} />
            <span>{player.nflTeam?.abbreviation ?? "FA"}</span>
          </div>
        </div>
        <Moon className="h-4 w-4 shrink-0 text-primary" />
      </CardHeader>
      <CardContent className="space-y-3">
        <ValueIndicator score={sleeper.sleeperScore} label="Sleeper score" />

        <div className={`grid gap-2 text-xs ${showDdaflAdjustment ? "grid-cols-3" : "grid-cols-2"}`}>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-muted-foreground">ADP</p>
            <p className="font-semibold tabular-nums">{player.adp?.overallADP?.toFixed(1) ?? "-"}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-muted-foreground">Proj. Pts</p>
            <p className="font-semibold tabular-nums">{player.projection?.fantasyPoints?.toFixed(1) ?? "-"}</p>
          </div>
          {showDdaflAdjustment ? (
            <div className="rounded-md bg-muted/50 px-2 py-1.5">
              <p className="text-muted-foreground">DDAFL Est.</p>
              <p className="font-semibold tabular-nums">
                <DdaflAdjustmentBadge adjustment={sleeper.ddaflAdjustment ?? 1} />
              </p>
            </div>
          ) : null}
        </div>

        {sleeper.reasons.length > 0 ? (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {sleeper.reasons.map((reason, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-primary">&bull;</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Ideal draft range{" "}
          <span className="font-semibold text-foreground">
            {sleeper.idealDraftRangeStart}&ndash;{sleeper.idealDraftRangeEnd}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
