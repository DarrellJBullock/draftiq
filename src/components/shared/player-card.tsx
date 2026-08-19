import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PositionBadge } from "./position-badge";
import { RookieBadge } from "./rookie-badge";
import { cn } from "@/lib/utils";
import type { PlayerWithContext } from "@/types";

export function PlayerCard({ player, className }: { player: PlayerWithContext; className?: string }) {
  const initials = `${player.firstName[0] ?? ""}${player.lastName[0] ?? ""}`.toUpperCase();

  return (
    <Link href={`/players/${player.id}`} className="block">
      <Card className={cn("border-border/70 transition-colors hover:border-primary/40", className)}>
        <CardContent className="flex items-center gap-3 p-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: player.nflTeam?.primaryColor ?? "#334155" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold">
                {player.firstName} {player.lastName}
              </p>
              {player.isRookie ? <RookieBadge /> : null}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <PositionBadge position={player.position} />
              <span>{player.nflTeam?.abbreviation ?? "FA"}</span>
              {player.playerSeason?.byeWeek ? <span>&middot; Bye {player.playerSeason.byeWeek}</span> : null}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold tabular-nums">#{player.ranking?.overallRank ?? "-"}</p>
            <p className="text-[11px] text-muted-foreground">ADP {player.adp?.overallADP?.toFixed(1) ?? "-"}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function InjuryBadge({ status }: { status: string }) {
  if (status === "HEALTHY") return null;
  const tone = status === "OUT" || status === "IR" || status === "SUSPENDED" ? "destructive" : "outline";
  return (
    <Badge variant={tone as "destructive" | "outline"} className="text-[10px]">
      {status}
    </Badge>
  );
}
