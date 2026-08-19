import type { DraftMode } from "@prisma/client";

export interface PickSlot {
  round: number;
  pickInRound: number;
  overallPick: number;
  teamSlot: number; // 1-indexed
}

/** Full pick order for a draft. Snake reverses direction every round; linear always goes 1..teamCount. */
export function getPickOrder(teamCount: number, rounds: number, mode: DraftMode): PickSlot[] {
  const slots: PickSlot[] = [];
  for (let round = 1; round <= rounds; round++) {
    const reversed = mode === "SNAKE" && round % 2 === 0;
    for (let i = 0; i < teamCount; i++) {
      const pickInRound = i + 1;
      const teamSlot = reversed ? teamCount - i : i + 1;
      const overallPick = (round - 1) * teamCount + pickInRound;
      slots.push({ round, pickInRound, overallPick, teamSlot });
    }
  }
  return slots;
}

export function getOverallPick(teamCount: number, round: number, pickInRound: number): number {
  return (round - 1) * teamCount + pickInRound;
}

export function getRoundAndPickInRound(teamCount: number, overallPick: number): { round: number; pickInRound: number } {
  const round = Math.floor((overallPick - 1) / teamCount) + 1;
  const pickInRound = ((overallPick - 1) % teamCount) + 1;
  return { round, pickInRound };
}

export function getTeamSlotForPick(teamCount: number, mode: DraftMode, overallPick: number): number {
  const { round, pickInRound } = getRoundAndPickInRound(teamCount, overallPick);
  const reversed = mode === "SNAKE" && round % 2 === 0;
  return reversed ? teamCount - pickInRound + 1 : pickInRound;
}
