import type { CPUPersonality, Position } from "@prisma/client";

export interface DraftPoolPlayer {
  id: string;
  position: Position;
  overallRank: number;
  adp: number;
  projectedPoints: number;
  isRookie: boolean;
}

export interface RosterSlotsNeeded {
  qbSlots: number;
  rbSlots: number;
  wrSlots: number;
  teSlots: number;
  flexSlots: number;
  superflexSlots: number;
  kSlot: boolean;
  dstSlot: boolean;
  benchSize: number;
}

export interface CPUDraftContext {
  personality: CPUPersonality;
  round: number;
  overallPick: number;
  rosterPositionCounts: Partial<Record<Position, number>>;
  leagueSettings: RosterSlotsNeeded;
}

type Phase = "early" | "mid" | "late";

function phaseForRound(round: number): Phase {
  if (round <= 3) return "early";
  if (round <= 8) return "mid";
  return "late";
}

// Additive score bonus/penalty per position, by phase. Values are tuned by
// feel (this is the swappable "personality" table -- adjust freely).
const PERSONALITY_POSITION_BIAS: Record<CPUPersonality, Partial<Record<Phase, Partial<Record<Position, number>>>>> = {
  BPA: {},
  ZERO_RB: { early: { RB: -25, WR: 15 }, mid: { RB: -10, WR: 8 } },
  HERO_RB: { early: { RB: 10 }, mid: { RB: -20, WR: 10, TE: 8 } },
  ZERO_WR: { early: { WR: -25, RB: 15 }, mid: { WR: -10, RB: 8 } },
  EARLY_QB: { early: { QB: 20 }, mid: { QB: 10 } },
  LATE_QB: { early: { QB: -30 }, mid: { QB: -20 }, late: { QB: 15 } },
  ELITE_TE: { early: { TE: 22 }, mid: { TE: 8 } },
  ROOKIE_HEAVY: {},
  ADP_FOCUSED: {},
  SLEEPER_FOCUSED: {},
};

function positionSlotTarget(position: Position, settings: RosterSlotsNeeded): number {
  switch (position) {
    case "QB":
      return settings.qbSlots + settings.superflexSlots + 1; // +1 backup buffer
    case "RB":
      return settings.rbSlots + Math.ceil(settings.flexSlots / 2) + 2;
    case "WR":
      return settings.wrSlots + Math.ceil(settings.flexSlots / 2) + 2;
    case "TE":
      return settings.teSlots + 1;
    case "K":
      return settings.kSlot ? 1 : 0;
    case "DST":
      return settings.dstSlot ? 1 : 0;
    default:
      return 1;
  }
}

function needMultiplier(position: Position, ctx: CPUDraftContext): number {
  const have = ctx.rosterPositionCounts[position] ?? 0;
  const target = positionSlotTarget(position, ctx.leagueSettings);
  if (target === 0) return -1; // no need for this position at all (e.g. no K/DST slot)
  const remaining = target - have;
  if (remaining <= 0) return -0.4; // already have enough, mild suppression
  return Math.min(1, remaining / target);
}

function scorePlayer(player: DraftPoolPlayer, ctx: CPUDraftContext): number {
  let score = 100 - player.overallRank * 0.35;

  const phase = phaseForRound(ctx.round);
  const bias = PERSONALITY_POSITION_BIAS[ctx.personality]?.[phase]?.[player.position] ?? 0;
  score += bias;

  if (ctx.personality === "ADP_FOCUSED") {
    score = 100 - Math.abs(player.adp - ctx.overallPick) * 2.2;
  }
  if (ctx.personality === "SLEEPER_FOCUSED") {
    score += Math.max(0, player.adp - player.overallRank) * 1.6;
  }
  if (ctx.personality === "ROOKIE_HEAVY" && player.isRookie) {
    score += 24;
  }

  score += needMultiplier(player.position, ctx) * 18;

  // K/DST are essentially never worth taking before the final couple rounds.
  if ((player.position === "K" || player.position === "DST") && phaseForRound(ctx.round) !== "late") {
    score -= 60;
  }

  return score;
}

/**
 * Scores the available pool for this CPU's personality/context and returns
 * a weighted-random pick among the top candidates (so mocks vary run to
 * run without ever taking a wildly illogical player).
 */
export function cpuSelectPlayer(
  available: DraftPoolPlayer[],
  ctx: CPUDraftContext,
  rand: () => number = Math.random
): DraftPoolPlayer {
  const eligible = available.filter((p) => needMultiplier(p.position, ctx) > -1);
  const pool = eligible.length > 0 ? eligible : available;

  const scored = pool.map((p) => ({ player: p, score: scorePlayer(p, ctx) })).sort((a, b) => b.score - a.score);

  const topN = scored.slice(0, Math.min(5, scored.length));
  const minScore = Math.min(...topN.map((s) => s.score));
  const weights = topN.map((s) => s.score - minScore + 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let r = rand() * totalWeight;
  for (let i = 0; i < topN.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return topN[i]!.player;
  }
  return topN[0]!.player;
}

export { scorePlayer as scoreCPUCandidate, needMultiplier as cpuNeedMultiplier };
