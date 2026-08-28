"use client";

import { useMemo, useState } from "react";
import { LineChart, TrendingDown, TrendingUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PositionBadge } from "@/components/shared/position-badge";
import { RookieBadge } from "@/components/shared/rookie-badge";
import { DdaflAdjustmentBadge } from "@/components/shared/ddafl-adjustment-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { POSITIONS } from "@/types";
import type { Position } from "@/types";
import type { getADPBoard } from "@/lib/queries/adp";

type ADPPlayer = Awaited<ReturnType<typeof getADPBoard>>[number];
export interface ADPBoardRow extends ADPPlayer {
  flag: "STEAL" | "REACH" | null;
  /** Estimated multiplier for DDAFL's distance-tiered scoring bonuses -- 1 means no adjustment. */
  ddaflAdjustment?: number;
}

const POSITION_TABS = ["ALL", ...POSITIONS] as const;

/** Client component: position tabs filter the already-fetched ADP board without a server round trip. */
export function ADPBoard({ rows, showDdaflAdjustment = false }: { rows: ADPBoardRow[]; showDdaflAdjustment?: boolean }) {
  const [position, setPosition] = useState<(typeof POSITION_TABS)[number]>("ALL");

  const filtered = useMemo(
    () => (position === "ALL" ? rows : rows.filter((r) => r.position === position)),
    [rows, position]
  );

  return (
    <div>
      <Tabs value={position} onValueChange={(v) => setPosition(v as typeof position)}>
        <TabsList className="flex-wrap">
          {POSITION_TABS.map((p) => (
            <TabsTrigger key={p} value={p}>
              {p === "ALL" ? "All" : p}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-3">
        {filtered.length === 0 ? (
          <EmptyState icon={LineChart} title="No ADP data for this position" />
        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16">ADP</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="w-16">Pos</TableHead>
                  <TableHead className="w-16">Team</TableHead>
                  <TableHead className="w-20 text-right">Pos ADP</TableHead>
                  <TableHead className="w-24 text-right">Expert Rk</TableHead>
                  <TableHead className="w-24 text-right">Consensus Rk</TableHead>
                  {showDdaflAdjustment ? <TableHead className="w-24 text-right">DDAFL Est.</TableHead> : null}
                  <TableHead className="w-24">Flag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-bold tabular-nums">{row.adp?.overallADP?.toFixed(1) ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">
                          {row.firstName} {row.lastName}
                        </span>
                        {row.isRookie ? <RookieBadge /> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PositionBadge position={row.position as Position} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.nflTeam?.abbreviation ?? "FA"}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.adp?.positionADP?.toFixed(1) ?? "-"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.expertRanking?.overallRank ?? "-"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.consensusRanking?.overallRank ?? "-"}
                    </TableCell>
                    {showDdaflAdjustment ? (
                      <TableCell className="text-right tabular-nums">
                        <DdaflAdjustmentBadge adjustment={row.ddaflAdjustment ?? 1} />
                      </TableCell>
                    ) : null}
                    <TableCell>
                      {row.flag === "STEAL" ? (
                        <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                          <TrendingUp className="h-3 w-3" /> Steal
                        </Badge>
                      ) : row.flag === "REACH" ? (
                        <Badge variant="outline" className="gap-1 border-rose-500/30 bg-rose-500/15 text-rose-400">
                          <TrendingDown className="h-3 w-3" /> Reach
                        </Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
