import type { Position } from "@prisma/client";
import type { PlayerWithContext } from "@/types";
import type { LeagueSettingsInput } from "@/lib/validation/league";
import { calculateFantasyPoints, type ScoringSettings } from "@/lib/services/scoring";
import type { RosterPlayerWithPlayer } from "@/lib/queries/roster";

export interface StarterSlotDef {
  /** Stable identifier written into RosterPlayer.slot, e.g. "RB1", "FLEX2". */
  id: string;
  /** Group this slot belongs to, e.g. "RB", "FLEX". */
  group: string;
  positions: Position[];
}

/** Expands a league's required-slot counts (qbSlots, rbSlots, ...) into individual starter slots. */
export function buildStarterSlots(settings: LeagueSettingsInput): StarterSlotDef[] {
  const slots: StarterSlotDef[] = [];
  const push = (group: string, count: number, positions: Position[]) => {
    for (let i = 1; i <= count; i++) slots.push({ id: `${group}${i}`, group, positions });
  };

  push("QB", settings.qbSlots, ["QB"]);
  push("RB", settings.rbSlots, ["RB"]);
  push("WR", settings.wrSlots, ["WR"]);
  push("TE", settings.teSlots, ["TE"]);
  push("FLEX", settings.flexSlots, ["RB", "WR", "TE"]);
  push("SUPERFLEX", settings.superflexSlots, ["QB", "RB", "WR", "TE"]);
  if (settings.kSlot) push("K", 1, ["K"]);
  if (settings.dstSlot) push("DST", 1, ["DST"]);

  return slots;
}

export function projectedPoints(player: PlayerWithContext, settings: ScoringSettings): number {
  if (!player.projection) return 0;
  return calculateFantasyPoints(player.projection, settings, player.position === "TE");
}

/** Assigns rostered players to starter slots by matching RosterPlayer.slot, everyone else falls to bench. */
export function assignToSlots(rosterPlayers: RosterPlayerWithPlayer[], starterSlots: StarterSlotDef[]) {
  const byId = new Map(rosterPlayers.map((rp) => [rp.slot, rp]));
  const starters = starterSlots.map((slot) => ({ slot, rosterPlayer: byId.get(slot.id) ?? null }));

  const starterSlotIds = new Set(starterSlots.map((s) => s.id));
  const bench = rosterPlayers.filter((rp) => !starterSlotIds.has(rp.slot));

  return { starters, bench };
}

export interface RosterGrade {
  letter: string;
  score: number;
  explanation: string;
}

/**
 * Simple, transparent roster grade: 60% how full the required starting lineup
 * is (filledStarterSlots / totalStarterSlots), 40% the average value-engine
 * "overallValue" (0-100) of the players actually starting. This rewards both
 * a complete lineup and a lineup made of strong players, without depending on
 * draft-specific data (ADP-vs-pick value) that a manually-built roster doesn't have.
 */
export function computeRosterGrade(filledStarterSlots: number, totalStarterSlots: number, avgStarterValue: number): RosterGrade {
  const fillRatio = totalStarterSlots === 0 ? 1 : filledStarterSlots / totalStarterSlots;
  const score = Math.round((fillRatio * 100 * 0.6 + avgStarterValue * 0.4) * 10) / 10;

  const letter =
    score >= 93 ? "A+" : score >= 87 ? "A" : score >= 80 ? "A-" : score >= 73 ? "B+" : score >= 65 ? "B" : score >= 55 ? "C+" : score >= 45 ? "C" : score >= 30 ? "D" : "F";

  const explanation = `${Math.round(fillRatio * 100)}% of starting slots filled, averaging a ${avgStarterValue.toFixed(0)}/100 value score across your starters.`;

  return { letter, score, explanation };
}

export interface RosterInsights {
  strengths: string[];
  weaknesses: string[];
}

/** Lightweight, rule-based roster read -- position depth counts and bye-week clustering, nothing draft-engine specific. */
export function computeRosterInsights(
  rosterPlayers: RosterPlayerWithPlayer[],
  starters: { slot: StarterSlotDef; rosterPlayer: RosterPlayerWithPlayer | null }[]
): RosterInsights {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  const depthCounts: Partial<Record<Position, number>> = {};
  for (const rp of rosterPlayers) {
    depthCounts[rp.player.position] = (depthCounts[rp.player.position] ?? 0) + 1;
  }

  const DEPTH_THRESHOLDS: Partial<Record<Position, { thin: number; strong: number }>> = {
    QB: { thin: 1, strong: 3 },
    RB: { thin: 4, strong: 6 },
    WR: { thin: 4, strong: 6 },
    TE: { thin: 1, strong: 3 },
  };

  for (const [position, threshold] of Object.entries(DEPTH_THRESHOLDS) as [Position, { thin: number; strong: number }][]) {
    const count = depthCounts[position] ?? 0;
    if (count <= threshold.thin) weaknesses.push(`Thin at ${position} (${count} rostered)`);
    else if (count >= threshold.strong) strengths.push(`Strong ${position} depth (${count} rostered)`);
  }

  const emptyStarters = starters.filter((s) => !s.rosterPlayer);
  if (emptyStarters.length > 0) {
    const groups = [...new Set(emptyStarters.map((s) => s.slot.group))];
    weaknesses.push(`Missing a starter at ${groups.join(", ")}`);
  } else {
    strengths.push("Full starting lineup with no open slots");
  }

  const byeWeekCounts = new Map<number, number>();
  for (const s of starters) {
    const bye = s.rosterPlayer?.player.playerSeason?.byeWeek;
    if (bye) byeWeekCounts.set(bye, (byeWeekCounts.get(bye) ?? 0) + 1);
  }
  for (const [week, count] of byeWeekCounts) {
    if (count >= 2) weaknesses.push(`${count} starters share a Week ${week} bye`);
  }

  return { strengths, weaknesses };
}
