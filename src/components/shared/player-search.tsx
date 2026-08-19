"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { POSITIONS, POSITION_LABELS } from "@/types";
import { injuryStatusSchema, riskLevelSchema } from "@/lib/validation/common";

const ALL = "ALL";

const PLAYER_TYPES = [
  { value: ALL, label: "All players" },
  { value: "rookie", label: "Rookies only" },
  { value: "veteran", label: "Veterans only" },
  { value: "freeAgent", label: "Free agents only" },
];

const SORT_OPTIONS = [
  { value: "overallRank", label: "Overall rank" },
  { value: "adp", label: "ADP" },
  { value: "fantasyPoints", label: "Projected points" },
  { value: "name", label: "Name" },
];

const BYE_WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);
const TIERS = Array.from({ length: 8 }, (_, i) => i + 1);

interface PlayerSearchProps {
  teams: { abbreviation: string; name: string }[];
}

/**
 * Client filter bar for the player database: writes filters into the URL
 * search params so the server-rendered table below re-fetches on navigation.
 */
export function PlayerSearch({ teams }: PlayerSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");

  const currentPlayerType = useMemo(() => {
    if (searchParams.get("rookie") === "true") return "rookie";
    if (searchParams.get("veteran") === "true") return "veteran";
    if (searchParams.get("freeAgent") === "true") return "freeAgent";
    return ALL;
  }, [searchParams]);

  const pushParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      pushParams((params) => {
        if (value === undefined || value === "" || value === ALL) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
    },
    [pushParams]
  );

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setParam("search", value), 350);
  };

  const handlePlayerType = (value: string) => {
    pushParams((params) => {
      params.delete("rookie");
      params.delete("veteran");
      params.delete("freeAgent");
      if (value !== ALL) params.set(value, "true");
    });
  };

  const resetFilters = () => {
    setSearchValue("");
    router.push(pathname);
  };

  const hasFilters = searchParams.toString().length > 0;

  return (
    <div className="mb-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Label className="mb-1.5 block text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name..."
              className="pl-8"
            />
          </div>
        </div>

        <FilterSelect
          label="Position"
          value={searchParams.get("position") ?? ALL}
          onChange={(v) => setParam("position", v)}
          options={[{ value: ALL, label: "All positions" }, ...POSITIONS.map((p) => ({ value: p, label: `${p} · ${POSITION_LABELS[p]}` }))]}
        />

        <FilterSelect
          label="NFL Team"
          value={searchParams.get("team") ?? ALL}
          onChange={(v) => setParam("team", v)}
          options={[{ value: ALL, label: "All teams" }, ...teams.map((t) => ({ value: t.abbreviation, label: `${t.abbreviation} · ${t.name}` }))]}
        />

        <FilterSelect label="Status" value={currentPlayerType} onChange={handlePlayerType} options={PLAYER_TYPES} />

        <FilterSelect
          label="Injury"
          value={searchParams.get("injuryStatus") ?? ALL}
          onChange={(v) => setParam("injuryStatus", v)}
          options={[{ value: ALL, label: "Any status" }, ...injuryStatusSchema.options.map((s) => ({ value: s, label: s }))]}
        />

        <FilterSelect
          label="Risk"
          value={searchParams.get("riskLevel") ?? ALL}
          onChange={(v) => setParam("riskLevel", v)}
          options={[{ value: ALL, label: "Any risk" }, ...riskLevelSchema.options.map((s) => ({ value: s, label: s }))]}
        />

        <FilterSelect
          label="Tier"
          value={searchParams.get("tier") ?? ALL}
          onChange={(v) => setParam("tier", v)}
          options={[{ value: ALL, label: "Any tier" }, ...TIERS.map((t) => ({ value: String(t), label: `Tier ${t}` }))]}
        />

        <FilterSelect
          label="Bye week"
          value={searchParams.get("byeWeek") ?? ALL}
          onChange={(v) => setParam("byeWeek", v)}
          options={[{ value: ALL, label: "Any week" }, ...BYE_WEEKS.map((w) => ({ value: String(w), label: `Week ${w}` }))]}
        />

        <div className="w-24">
          <Label className="mb-1.5 block text-xs text-muted-foreground">Rank ≤</Label>
          <Input
            type="number"
            min={1}
            defaultValue={searchParams.get("rankMax") ?? ""}
            onBlur={(e) => setParam("rankMax", e.target.value)}
            placeholder="e.g. 100"
          />
        </div>

        <div className="w-20">
          <Label className="mb-1.5 block text-xs text-muted-foreground">ADP min</Label>
          <Input
            type="number"
            min={0}
            defaultValue={searchParams.get("adpMin") ?? ""}
            onBlur={(e) => setParam("adpMin", e.target.value)}
          />
        </div>

        <div className="w-20">
          <Label className="mb-1.5 block text-xs text-muted-foreground">ADP max</Label>
          <Input
            type="number"
            min={0}
            defaultValue={searchParams.get("adpMax") ?? ""}
            onBlur={(e) => setParam("adpMax", e.target.value)}
          />
        </div>

        <div className="w-20">
          <Label className="mb-1.5 block text-xs text-muted-foreground">Age ≤</Label>
          <Input
            type="number"
            min={18}
            defaultValue={searchParams.get("ageMax") ?? ""}
            onBlur={(e) => setParam("ageMax", e.target.value)}
          />
        </div>

        <FilterSelect
          label="Sort by"
          value={searchParams.get("sortBy") ?? "overallRank"}
          onChange={(v) => setParam("sortBy", v)}
          options={SORT_OPTIONS}
        />

        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="mb-0.5">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="w-[168px]">
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
