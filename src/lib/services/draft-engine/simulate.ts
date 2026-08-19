import type { CPUPersonality, DraftMode, Position, StrategyType } from "@prisma/client";
import { getPickOrder } from "./pick-order";
import { cpuSelectPlayer, type CPUDraftContext, type DraftPoolPlayer, type RosterSlotsNeeded } from "./cpu";

export interface SimulatedPick {
  overallPick: number;
  round: number;
  pickInRound: number;
  teamSlot: number;
  playerId: string;
  isUserPick: boolean;
  adpAtPick: number;
  valueAtPick: number; // overallRank at the time picked, lower/better = more value if adp was higher
}

export interface SimulateFullDraftInput {
  teamCount: number;
  rounds: number;
  draftPosition: number;
  mode: DraftMode;
  /** One personality per non-user team slot; length should be teamCount - 1 in draft order excluding the user's slot. */
  cpuPersonalities: CPUPersonality[];
  userStrategy?: StrategyType;
  pool: DraftPoolPlayer[];
  leagueSettings: RosterSlotsNeeded;
  rand?: () => number;
}

const STRATEGY_TO_PERSONALITY: Record<StrategyType, CPUPersonality> = {
  ZERO_RB: "ZERO_RB",
  HERO_RB: "HERO_RB",
  ROBUST_RB: "HERO_RB",
  ZERO_WR: "ZERO_WR",
  HERO_WR: "BPA",
  LATE_ROUND_QB: "LATE_QB",
  EARLY_QB: "EARLY_QB",
  ELITE_TE: "ELITE_TE",
  LATE_ROUND_TE: "BPA",
  BALANCED: "BPA",
};

export function simulateFullDraft(input: SimulateFullDraftInput): SimulatedPick[] {
  const rand = input.rand ?? Math.random;
  const order = getPickOrder(input.teamCount, input.rounds, input.mode);

  const personalityBySlot = new Map<number, CPUPersonality>();
  let cpuIdx = 0;
  for (let slot = 1; slot <= input.teamCount; slot++) {
    if (slot === input.draftPosition) {
      personalityBySlot.set(slot, input.userStrategy ? STRATEGY_TO_PERSONALITY[input.userStrategy] : "BPA");
    } else {
      personalityBySlot.set(slot, input.cpuPersonalities[cpuIdx % Math.max(1, input.cpuPersonalities.length)] ?? "BPA");
      cpuIdx++;
    }
  }

  const available = new Map(input.pool.map((p) => [p.id, p]));
  const rosterCountsBySlot = new Map<number, Partial<Record<Position, number>>>();
  for (let slot = 1; slot <= input.teamCount; slot++) rosterCountsBySlot.set(slot, {});

  const picks: SimulatedPick[] = [];

  for (const slotInfo of order) {
    const remaining = [...available.values()];
    if (remaining.length === 0) break;

    const personality = personalityBySlot.get(slotInfo.teamSlot)!;
    const ctx: CPUDraftContext = {
      personality,
      round: slotInfo.round,
      overallPick: slotInfo.overallPick,
      rosterPositionCounts: rosterCountsBySlot.get(slotInfo.teamSlot)!,
      leagueSettings: input.leagueSettings,
    };

    const selected = cpuSelectPlayer(remaining, ctx, rand);
    available.delete(selected.id);

    const counts = rosterCountsBySlot.get(slotInfo.teamSlot)!;
    counts[selected.position] = (counts[selected.position] ?? 0) + 1;

    picks.push({
      overallPick: slotInfo.overallPick,
      round: slotInfo.round,
      pickInRound: slotInfo.pickInRound,
      teamSlot: slotInfo.teamSlot,
      playerId: selected.id,
      isUserPick: slotInfo.teamSlot === input.draftPosition,
      adpAtPick: selected.adp,
      valueAtPick: selected.overallRank,
    });
  }

  return picks;
}

export type { DraftPoolPlayer, RosterSlotsNeeded };
