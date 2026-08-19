"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import type { Position, ScoringFormatPreset } from "@prisma/client";
import type { PlayerWithContext } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { PositionBadge } from "./position-badge";
import { RookieBadge } from "./rookie-badge";
import { cn } from "@/lib/utils";

interface PlayerPickerProps {
  season: number;
  scoringFormat: ScoringFormatPreset;
  /** Restricts the pool client-side, e.g. ["RB", "WR", "TE"] for a FLEX slot. Omit for no restriction (K/DST included). */
  eligiblePositions?: Position[];
  /** Player ids to hide from results (e.g. already rostered / already on the other trade side). */
  excludeIds?: string[];
  onSelect: (player: PlayerWithContext) => void;
  triggerLabel?: string;
  className?: string;
}

/** Debounced player search-and-select, backed by GET /api/players. Reused by Team Builder and Trade Analyzer. */
export function PlayerPicker({ season, scoringFormat, eligiblePositions, excludeIds, onSelect, triggerLabel, className }: PlayerPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<PlayerWithContext[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const singlePosition = eligiblePositions?.length === 1 ? eligiblePositions[0] : undefined;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    // Standard fetch-in-effect loading flag (matches React's own data-fetching example);
    // the request itself is the external system this effect synchronizes with.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    const params = new URLSearchParams({
      season: String(season),
      scoringFormat,
      pageSize: "20",
      sortBy: "overallRank",
    });
    if (debounced) params.set("search", debounced);
    if (singlePosition) params.set("position", singlePosition);

    fetch(`/api/players?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { players: PlayerWithContext[] }) => setResults(data.players ?? []))
      .catch((err) => {
        if (err?.name !== "AbortError") setResults([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [open, debounced, season, scoringFormat, singlePosition]);

  const exclude = useMemo(() => new Set(excludeIds ?? []), [excludeIds]);
  const filtered = results.filter((p) => {
    if (exclude.has(p.id)) return false;
    if (eligiblePositions && eligiblePositions.length > 1 && !eligiblePositions.includes(p.position)) return false;
    return true;
  });

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1.5 border-dashed", className)}>
          <UserPlus className="h-3.5 w-3.5" />
          {triggerLabel ?? "Add player"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search players..." value={query} onValueChange={setQuery} />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Search className="h-3.5 w-3.5 animate-pulse" /> Searching...
              </div>
            ) : (
              <>
                <CommandEmpty>No players found.</CommandEmpty>
                <CommandGroup>
                  {filtered.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={p.id}
                      onSelect={() => {
                        onSelect(p);
                        setOpen(false);
                        setQuery("");
                      }}
                      className="cursor-pointer gap-2"
                    >
                      <PositionBadge position={p.position} />
                      <span className="min-w-0 flex-1 truncate">
                        {p.firstName} {p.lastName}
                      </span>
                      {p.isRookie ? <RookieBadge /> : null}
                      <span className="shrink-0 text-xs text-muted-foreground">{p.nflTeam?.abbreviation ?? "FA"}</span>
                      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        ADP {p.adp?.overallADP?.toFixed(1) ?? "-"}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
