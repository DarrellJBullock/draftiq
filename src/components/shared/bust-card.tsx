import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PositionBadge } from "./position-badge";
import { RookieBadge } from "./rookie-badge";
import { DdaflAdjustmentBadge } from "./ddafl-adjustment-badge";
import type { PlayerWithContext } from "@/types";

export interface BustCardData {
  player: PlayerWithContext;
  bustScore: number;
  riskFactors: string[];
  suggestedDraftRangeStart: number;
  suggestedDraftRangeEnd: number;
  /** Estimated multiplier for DDAFL's distance-tiered scoring bonuses -- 1 means no adjustment. */
  ddaflAdjustment?: number;
}

function toneFor(score: number) {
  if (score >= 65) return "text-rose-400";
  if (score >= 40) return "text-amber-400";
  return "text-muted-foreground";
}

/** Card summarizing why a player is priced above their underlying ranking/risk profile. */
export function BustCard({ bust, showDdaflAdjustment = false }: { bust: BustCardData; showDdaflAdjustment?: boolean }) {
  const { player } = bust;

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
        <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(100, Math.max(0, bust.bustScore))}%` }} />
          </div>
          <span className={`text-xs font-semibold tabular-nums ${toneFor(bust.bustScore)}`}>{bust.bustScore.toFixed(0)}</span>
          <span className="text-xs text-muted-foreground">Bust score</span>
        </div>

        <div className={`grid gap-2 text-xs ${showDdaflAdjustment ? "grid-cols-3" : "grid-cols-2"}`}>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-muted-foreground">ADP</p>
            <p className="font-semibold tabular-nums">{player.adp?.overallADP?.toFixed(1) ?? "-"}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-muted-foreground">Rank</p>
            <p className="font-semibold tabular-nums">#{player.ranking?.overallRank ?? "-"}</p>
          </div>
          {showDdaflAdjustment ? (
            <div className="rounded-md bg-muted/50 px-2 py-1.5">
              <p className="text-muted-foreground">DDAFL Est.</p>
              <p className="font-semibold tabular-nums">
                <DdaflAdjustmentBadge adjustment={bust.ddaflAdjustment ?? 1} />
              </p>
            </div>
          ) : null}
        </div>

        {bust.riskFactors.length > 0 ? (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {bust.riskFactors.map((reason, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-rose-400">&bull;</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Safer range{" "}
          <span className="font-semibold text-foreground">
            {bust.suggestedDraftRangeStart}&ndash;{bust.suggestedDraftRangeEnd}
          </span>{" "}
          or later
        </p>
      </CardContent>
    </Card>
  );
}
