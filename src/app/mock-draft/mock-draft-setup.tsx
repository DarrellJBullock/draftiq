"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Swords, Users, X } from "lucide-react";
import type { ScoringFormatPreset } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayerPicker } from "@/components/shared/player-picker";
import { PositionBadge } from "@/components/shared/position-badge";
import { STRATEGY_LABELS } from "@/lib/services/strategy-engine";
import { SCORING_FORMAT_LABELS } from "@/types";
import type { PlayerWithContext, StrategyType } from "@/types";

interface KeeperEntry {
  teamSlot: number;
  playerId: string;
  firstName: string;
  lastName: string;
  position: PlayerWithContext["position"];
}

const CPU_MIX_OPTIONS: { value: string; label: string }[] = [
  { value: "mixed", label: "Mixed personalities (recommended)" },
  { value: "BPA", label: "All Best Player Available" },
  { value: "ADP_FOCUSED", label: "All ADP-focused" },
  { value: "ROOKIE_HEAVY", label: "All rookie-heavy" },
  { value: "SLEEPER_FOCUSED", label: "All sleeper-focused" },
];

export function MockDraftSetup({
  season,
  defaultTeamCount,
  defaultScoringFormat,
  defaultRounds,
  knownConferences,
}: {
  season: number;
  defaultTeamCount: number;
  defaultScoringFormat: ScoringFormatPreset;
  defaultRounds: number;
  knownConferences: string[];
}) {
  const router = useRouter();
  const [teamCount, setTeamCount] = useState(defaultTeamCount);
  const [draftPosition, setDraftPosition] = useState(Math.ceil(defaultTeamCount / 2));
  const [rounds, setRounds] = useState(defaultRounds);
  const [mode, setMode] = useState<"SNAKE" | "LINEAR">("SNAKE");
  const [scoringFormat, setScoringFormat] = useState<ScoringFormatPreset>(defaultScoringFormat);
  const [userStrategy, setUserStrategy] = useState<StrategyType | "">("");
  const [cpuMix, setCpuMix] = useState("mixed");
  const [conference, setConference] = useState(knownConferences[0] ?? "");
  const [keepers, setKeepers] = useState<KeeperEntry[]>([]);
  const [keeperTeamSlot, setKeeperTeamSlot] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addKeeper(player: PlayerWithContext) {
    setKeepers((prev) => [
      ...prev.filter((k) => k.teamSlot !== keeperTeamSlot),
      { teamSlot: keeperTeamSlot, playerId: player.id, firstName: player.firstName, lastName: player.lastName, position: player.position },
    ]);
  }

  async function startDraft() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/draft/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season,
          teamCount,
          rounds,
          draftPosition,
          mode,
          scoringFormat,
          conference: conference.trim() || undefined,
          userStrategy: userStrategy || undefined,
          cpuPersonalities: cpuMix === "mixed" ? undefined : Array.from({ length: teamCount - 1 }, () => cpuMix),
          keepers: keepers.map((k) => ({ teamSlot: k.teamSlot, playerId: k.playerId })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to run mock draft");
      router.push(`/mock-draft/${data.mockDraftId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run mock draft");
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Mock Draft Setup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <Label className="text-xs text-muted-foreground">League size</Label>
            <input
              type="number"
              min={4}
              max={20}
              value={teamCount}
              onChange={(e) => {
                const v = Number(e.target.value) || teamCount;
                setTeamCount(v);
                setDraftPosition((p) => Math.min(p, v));
              }}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Your draft position</Label>
            <select value={draftPosition} onChange={(e) => setDraftPosition(Number(e.target.value))} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              {Array.from({ length: teamCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Pick {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Rounds</Label>
            <input
              type="number"
              min={1}
              max={25}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value) || rounds)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Draft type</Label>
            <select value={mode} onChange={(e) => setMode(e.target.value as "SNAKE" | "LINEAR")} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="SNAKE">Snake</option>
              <option value="LINEAR">Linear</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label className="text-xs text-muted-foreground">Scoring format</Label>
            <select value={scoringFormat} onChange={(e) => setScoringFormat(e.target.value as ScoringFormatPreset)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              {Object.entries(SCORING_FORMAT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Your draft strategy</Label>
            <select value={userStrategy} onChange={(e) => setUserStrategy(e.target.value as StrategyType | "")} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Best player available</option>
              {Object.entries(STRATEGY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">CPU manager tendencies</Label>
            <select value={cpuMix} onChange={(e) => setCpuMix(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              {CPU_MIX_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Conference / group (optional)</Label>
          <input
            list="mock-draft-conferences"
            value={conference}
            onChange={(e) => setConference(e.target.value)}
            placeholder="e.g. NFC -- leave blank for a single-draft league"
            maxLength={40}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
          <datalist id="mock-draft-conferences">
            {knownConferences.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="rounded-md border border-dashed border-border p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Keepers (optional)
          </p>
          {keepers.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {keepers
                .sort((a, b) => a.teamSlot - b.teamSlot)
                .map((k) => (
                  <Badge key={k.teamSlot} variant="outline" className="gap-1.5 pr-1">
                    Team {k.teamSlot}: <PositionBadge position={k.position} className="h-4 min-w-6 px-1 text-[10px]" />
                    {k.firstName} {k.lastName}
                    <button onClick={() => setKeepers((prev) => prev.filter((x) => x.teamSlot !== k.teamSlot))} className="ml-1 rounded hover:text-rose-400">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            <select value={keeperTeamSlot} onChange={(e) => setKeeperTeamSlot(Number(e.target.value))} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
              {Array.from({ length: teamCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Team {n}
                  {n === draftPosition ? " (You)" : ""}
                </option>
              ))}
            </select>
            <PlayerPicker
              season={season}
              scoringFormat={scoringFormat}
              excludeIds={keepers.map((k) => k.playerId)}
              onSelect={addKeeper}
              triggerLabel="Add keeper"
            />
          </div>
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <Button onClick={startDraft} disabled={loading} size="lg" className="w-full gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
          {loading ? "Simulating draft..." : "Run Mock Draft"}
        </Button>
      </CardContent>
    </Card>
  );
}
