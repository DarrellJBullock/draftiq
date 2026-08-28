import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PositionBadge } from "./position-badge";
import { ValueIndicator } from "./value-indicator";
import { DdaflAdjustmentBadge } from "./ddafl-adjustment-badge";
import { cn } from "@/lib/utils";
import type { PlayerWithContext } from "@/types";

/**
 * Rookie summary card for the Rookie Watch dashboard. Highlights why a
 * rookie has fantasy value: draft capital, opportunity, and landing spot.
 * A `highlight` prop lets each dashboard section spotlight the metric it's
 * ranked by (e.g. breakout score in the "Breakout Candidates" section).
 */
export function RookieCard({
  player,
  highlight,
  footer,
  className,
  ddaflAdjustment,
}: {
  player: PlayerWithContext;
  highlight?: { label: string; score: number };
  footer?: React.ReactNode;
  className?: string;
  /** Estimated multiplier for DDAFL's distance-tiered scoring bonuses -- omit to hide. */
  ddaflAdjustment?: number;
}) {
  const rp = player.rookieProfile;

  return (
    <Link href={`/players/${player.id}`} className="block">
      <Card className={cn("border-border/70 transition-colors hover:border-primary/40", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <PositionBadge position={player.position} />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
              {player.firstName} {player.lastName}
            </p>
            <span className="shrink-0 text-xs text-muted-foreground">{player.nflTeam?.abbreviation ?? "FA"}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">
              {rp?.draftRound ? `Rd ${rp.draftRound}, Pk ${rp.draftPick ?? "?"}` : "Draft info N/A"}
            </Badge>
            {rp?.overallFantasyRank ? <span>Rookie #{rp.overallFantasyRank}</span> : null}
            {player.adp?.overallADP ? <span>&middot; ADP {player.adp.overallADP.toFixed(1)}</span> : null}
            {ddaflAdjustment !== undefined ? (
              <span>
                &middot; DDAFL <DdaflAdjustmentBadge adjustment={ddaflAdjustment} />
              </span>
            ) : null}
          </div>

          <div className="mt-3 space-y-1.5">
            {highlight ? (
              <ValueIndicator score={highlight.score} label={highlight.label} />
            ) : (
              <>
                {rp?.opportunityScore !== null && rp?.opportunityScore !== undefined ? (
                  <ValueIndicator score={rp.opportunityScore} label="Opportunity" />
                ) : null}
                {rp?.landingSpotScore !== null && rp?.landingSpotScore !== undefined ? (
                  <ValueIndicator score={rp.landingSpotScore} label="Landing Spot" />
                ) : null}
              </>
            )}
          </div>

          {footer ? <div className="mt-2 text-xs text-muted-foreground">{footer}</div> : null}
        </CardContent>
      </Card>
    </Link>
  );
}
