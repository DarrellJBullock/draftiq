import Link from "next/link";
import type { Position } from "@prisma/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PositionBadge } from "./position-badge";
import { RookieBadge } from "./rookie-badge";
import { InjuryBadge } from "./player-card";
import { DdaflAdjustmentBadge } from "./ddafl-adjustment-badge";
import { calculateDdaflAdjustment } from "@/lib/services/scoring/ddafl-adjustment";
import type { PlayerWithContext } from "@/types";

/**
 * Dense, sortable-looking player table for the /players database view.
 * Server-renderable: no client-side state, just presents the rows it's given.
 */
export function PlayerTable({
  players,
  showDdaflAdjustment = false,
  positionAverageYPT = {},
}: {
  players: PlayerWithContext[];
  showDdaflAdjustment?: boolean;
  positionAverageYPT?: Partial<Record<Position, number | null>>;
}) {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-14">Pos</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-right">Age</TableHead>
            <TableHead className="text-right">Bye</TableHead>
            <TableHead>Injury</TableHead>
            <TableHead className="text-right">Rank</TableHead>
            <TableHead className="text-right">Pos Rk</TableHead>
            <TableHead className="text-right">ADP</TableHead>
            <TableHead className="text-right">Proj Pts</TableHead>
            {showDdaflAdjustment ? <TableHead className="text-right">DDAFL Est.</TableHead> : null}
            <TableHead>Tier</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => (
            <TableRow key={player.id}>
              <TableCell>
                <PositionBadge position={player.position} />
              </TableCell>
              <TableCell>
                <Link href={`/players/${player.id}`} className="flex items-center gap-1.5 font-medium hover:text-primary hover:underline">
                  {player.firstName} {player.lastName}
                  {player.isRookie ? <RookieBadge /> : null}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{player.nflTeam?.abbreviation ?? "FA"}</TableCell>
              <TableCell className="text-right tabular-nums">{player.age ?? "-"}</TableCell>
              <TableCell className="text-right tabular-nums">{player.playerSeason?.byeWeek ?? "-"}</TableCell>
              <TableCell>
                {player.injuryStatus === "HEALTHY" ? (
                  <span className="text-xs text-muted-foreground">Healthy</span>
                ) : (
                  <InjuryBadge status={player.injuryStatus} />
                )}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{player.ranking?.overallRank ?? "-"}</TableCell>
              <TableCell className="text-right tabular-nums">{player.ranking?.positionRank ?? "-"}</TableCell>
              <TableCell className="text-right tabular-nums">{player.adp?.overallADP?.toFixed(1) ?? "-"}</TableCell>
              <TableCell className="text-right tabular-nums">{player.projection?.fantasyPoints?.toFixed(1) ?? "-"}</TableCell>
              {showDdaflAdjustment ? (
                <TableCell className="text-right tabular-nums">
                  <DdaflAdjustmentBadge
                    adjustment={calculateDdaflAdjustment(
                      {
                        position: player.position,
                        rushAttempts: player.projection?.rushAttempts,
                        rushingYards: player.projection?.rushingYards,
                        receptions: player.projection?.receptions,
                        receivingYards: player.projection?.receivingYards,
                        attempts: player.projection?.attempts,
                        passingYards: player.projection?.passingYards,
                      },
                      positionAverageYPT[player.position] ?? null
                    )}
                  />
                </TableCell>
              ) : null}
              <TableCell>
                {player.playerSeason?.tier ? (
                  <span className="text-xs text-muted-foreground">{player.playerSeason.tier.label}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
