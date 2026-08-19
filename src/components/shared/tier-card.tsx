import { PositionBadge } from "./position-badge";
import { RookieBadge } from "./rookie-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PlayerWithContext } from "@/types";

export interface TierCardTier {
  id: string;
  tierNumber: number;
  label: string;
  colorHex: string | null;
  players: PlayerWithContext[];
}

/** Renders one draft tier: an accent bar/dot in the tier color, and its ranked player list. */
export function TierCard({ tier, position }: { tier: TierCardTier; position?: string }) {
  const accent = tier.colorHex ?? "#64748b";

  return (
    <Card className="border-border/70 overflow-hidden">
      <div className="h-1 w-full" style={{ backgroundColor: accent }} />
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
        <h3 className="text-sm font-bold">
          {position ? `${position} ` : ""}
          {tier.label || `Tier ${tier.tierNumber}`}
        </h3>
        <span className="ml-auto text-xs text-muted-foreground">{tier.players.length} players</span>
      </CardHeader>
      <CardContent className="space-y-1 pb-4">
        {tier.players.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">No players in this tier</p>
        ) : (
          tier.players.map((player) => (
            <div
              key={player.id}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40"
              )}
            >
              <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                {player.ranking?.positionRank ?? "-"}
              </span>
              <PositionBadge position={player.position} />
              <span className="min-w-0 flex-1 truncate font-medium">
                {player.firstName} {player.lastName}
              </span>
              {player.isRookie ? <RookieBadge /> : null}
              <span className="shrink-0 text-xs text-muted-foreground">{player.nflTeam?.abbreviation ?? "FA"}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
