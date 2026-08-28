"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RankingTable, type RankingTableRow } from "@/components/shared/ranking-table";
import type { RankingSource } from "@/types";
import { POSITIONS, POSITION_LABELS } from "@/types";
import { cn } from "@/lib/utils";

const POSITION_TABS = ["ALL", ...POSITIONS] as const;

/**
 * Client component: the rankings table itself needs no interactivity, but
 * switching consensus/expert source, filtering by position, and free-text
 * search are all client-side state so the page stays snappy without
 * re-hitting the server for every toggle. Both sources are fetched once on
 * the server and handed down as props.
 */
export function RankingsExplorer({
  consensus,
  expert,
  showDdaflAdjustment = false,
}: {
  consensus: RankingTableRow[];
  expert: RankingTableRow[];
  showDdaflAdjustment?: boolean;
}) {
  const [source, setSource] = useState<RankingSource>("CONSENSUS");
  const [position, setPosition] = useState<(typeof POSITION_TABS)[number]>("ALL");
  const [search, setSearch] = useState("");

  const rows = source === "CONSENSUS" ? consensus : expert;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (position !== "ALL" && row.player.position !== position) return false;
      if (q && !`${row.player.firstName} ${row.player.lastName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, position, search]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={position} onValueChange={(v) => setPosition(v as typeof position)}>
          <TabsList className="flex-wrap">
            {POSITION_TABS.map((p) => (
              <TabsTrigger key={p} value={p}>
                {p === "ALL" ? "All" : p}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players..."
              className="w-48 pl-8"
            />
          </div>
          <div className="flex h-9 items-center rounded-lg bg-muted p-1 text-sm">
            {(["CONSENSUS", "EXPERT"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={cn(
                  "rounded-md px-3 py-1 font-medium transition-colors",
                  source === s ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "CONSENSUS" ? "Consensus" : "Expert"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        {filtered.length} player{filtered.length === 1 ? "" : "s"}
        {position !== "ALL" ? ` · ${POSITION_LABELS[position]}` : ""} · {source === "CONSENSUS" ? "Consensus" : "Expert"} ranking
      </p>

      <RankingTable rows={filtered} showPosition={position === "ALL"} showDdaflAdjustment={showDdaflAdjustment} emptyLabel="No players match your search" />
    </div>
  );
}
