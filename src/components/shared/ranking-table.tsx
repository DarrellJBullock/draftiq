import type { ADP, NFLTeam, Player, Projection } from "@prisma/client";
import { PositionBadge } from "./position-badge";
import { RookieBadge } from "./rookie-badge";
import { InjuryBadge } from "./player-card";
import { DdaflAdjustmentBadge } from "./ddafl-adjustment-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "./empty-state";
import { ListOrdered } from "lucide-react";

export interface RankingTablePlayer
  extends Pick<Player, "id" | "firstName" | "lastName" | "position" | "isRookie" | "injuryStatus"> {
  nflTeam: Pick<NFLTeam, "abbreviation" | "primaryColor"> | null;
  adp?: Pick<ADP, "overallADP"> | null;
  projection?: Pick<Projection, "fantasyPoints"> | null;
}

export interface RankingTableRow {
  id: string;
  overallRank: number;
  positionRank: number;
  /** Estimated multiplier for DDAFL's distance-tiered scoring bonuses -- 1 means no adjustment. Omit to hide the column. */
  ddaflAdjustment?: number;
  player: RankingTablePlayer;
}

/** Dense ranking table shared by the Rankings and ADP pages. */
export function RankingTable({
  rows,
  showPosition = true,
  showDdaflAdjustment = false,
  emptyLabel = "No rankings found",
}: {
  rows: RankingTableRow[];
  showPosition?: boolean;
  showDdaflAdjustment?: boolean;
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState icon={ListOrdered} title={emptyLabel} description="Try a different filter or scoring format." />;
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-14">Rank</TableHead>
            <TableHead>Player</TableHead>
            {showPosition ? <TableHead className="w-16">Pos</TableHead> : null}
            <TableHead className="w-16">Pos Rk</TableHead>
            <TableHead className="w-16">Team</TableHead>
            <TableHead className="w-20 text-right">ADP</TableHead>
            <TableHead className="w-20 text-right">Proj Pts</TableHead>
            {showDdaflAdjustment ? <TableHead className="w-24 text-right">DDAFL Est.</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-bold tabular-nums">{row.overallRank}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">
                    {row.player.firstName} {row.player.lastName}
                  </span>
                  {row.player.isRookie ? <RookieBadge /> : null}
                  <InjuryBadge status={row.player.injuryStatus} />
                </div>
              </TableCell>
              {showPosition ? (
                <TableCell>
                  <PositionBadge position={row.player.position} />
                </TableCell>
              ) : null}
              <TableCell className="tabular-nums text-muted-foreground">{row.positionRank}</TableCell>
              <TableCell className="text-muted-foreground">{row.player.nflTeam?.abbreviation ?? "FA"}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {row.player.adp?.overallADP?.toFixed(1) ?? "-"}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {row.player.projection?.fantasyPoints?.toFixed(1) ?? "-"}
              </TableCell>
              {showDdaflAdjustment ? (
                <TableCell className="text-right tabular-nums">
                  <DdaflAdjustmentBadge adjustment={row.ddaflAdjustment ?? 1} />
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
