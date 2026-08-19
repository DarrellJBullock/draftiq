import type { Position, StrategyType } from "@prisma/client";

export interface StrategyLeagueContext {
  teamCount: number;
  draftPosition: number;
  qbSlots: number;
  superflexSlots: number;
  teSlots: number;
  tePremiumBonus: number;
  receptionPoints: number;
  benchSize: number;
}

export interface StrategyRecommendation {
  strategy: StrategyType;
  fitScore: number; // 0-100
  reasoning: string;
  positionPriorities: Position[];
  earlyRoundPlan: string;
  lateRoundTargets: string;
}

const STRATEGY_LABELS: Record<StrategyType, string> = {
  ZERO_RB: "Zero RB",
  HERO_RB: "Hero RB",
  ROBUST_RB: "Robust RB",
  ZERO_WR: "Zero WR",
  HERO_WR: "Hero WR",
  LATE_ROUND_QB: "Late Round QB",
  EARLY_QB: "Early QB",
  ELITE_TE: "Elite TE",
  LATE_ROUND_TE: "Late Round TE",
  BALANCED: "Balanced",
};

export { STRATEGY_LABELS };

function clamp(n: number) {
  return Math.min(100, Math.max(0, n));
}

/**
 * Scores every named strategy against the user's league settings and draft
 * slot, returning them ranked so the UI can show "recommended" plus
 * runner-up alternatives with the reasoning behind each score.
 */
export function recommendStrategies(ctx: StrategyLeagueContext): StrategyRecommendation[] {
  const isSuperflex = ctx.superflexSlots > 0 || ctx.qbSlots >= 2;
  const isTEPremium = ctx.tePremiumBonus > 0 || ctx.teSlots >= 2;
  const isHighPPR = ctx.receptionPoints >= 0.9;
  const earlyPick = ctx.draftPosition <= Math.ceil(ctx.teamCount * 0.25);
  const latePick = ctx.draftPosition >= Math.floor(ctx.teamCount * 0.75);
  const middlePick = !earlyPick && !latePick;

  const scores: Record<StrategyType, number> = {
    ZERO_RB: clamp(50 + (isHighPPR ? 20 : 0) + (latePick ? 10 : 0) - (isSuperflex ? 5 : 0)),
    HERO_RB: clamp(55 + (middlePick ? 15 : 0) + (earlyPick ? 10 : 0)),
    ROBUST_RB: clamp(45 + (earlyPick ? 20 : 0) - (isHighPPR ? 10 : 0)),
    ZERO_WR: clamp(30 + (earlyPick ? 10 : 0) - (isHighPPR ? 15 : 0)),
    HERO_WR: clamp(45 + (isHighPPR ? 10 : 0)),
    LATE_ROUND_QB: clamp(60 - (isSuperflex ? 40 : 0) + (ctx.benchSize <= 5 ? 5 : 0)),
    EARLY_QB: clamp(35 + (isSuperflex ? 45 : 0)),
    ELITE_TE: clamp(40 + (isTEPremium ? 35 : 0)),
    LATE_ROUND_TE: clamp(55 - (isTEPremium ? 30 : 0)),
    BALANCED: clamp(55 + (middlePick ? 10 : 0)),
  };

  const reasoningFor: Record<StrategyType, string> = {
    ZERO_RB: `Fade RBs early and load up on WR depth${isHighPPR ? " -- this league's high reception value rewards volume-based WR production" : ""}${
      latePick ? ", and drafting late means RB scarcity hits you hardest anyway" : ""
    }.`,
    HERO_RB: "Take one true RB1 early to anchor the position, then pivot to WR/TE value for the next several rounds before circling back to RB depth.",
    ROBUST_RB: `Prioritize RB in the first 2-3 rounds to build a scarcity edge${earlyPick ? " -- an early pick puts an elite back within reach" : ""}.`,
    ZERO_WR: "Load up on RB and TE early, treating WR as a volume position to fill later once the board thins.",
    HERO_WR: "Anchor with one true WR1 early, then diversify across RB and other positions.",
    LATE_ROUND_QB: `Wait on QB${isSuperflex ? "" : " since one-QB leagues have deep, replaceable production at the position"} and spend premium picks on scarce RB/WR talent.`,
    EARLY_QB: `${isSuperflex ? "Superflex/2-QB scoring makes QB the scarcest premium position -- prioritize one in the first two rounds." : "Lock in a top-tier passer early for a stable weekly floor."}`,
    ELITE_TE: `${isTEPremium ? "TE premium scoring rewards paying up for a top-tier tight end who separates from the replacement-level field." : "Draft a top-3 TE to create a weekly positional edge over the rest of your league."}`,
    LATE_ROUND_TE: `${isTEPremium ? "Even with TE premium scoring, wait and target the format's later-round TE spikes." : "TE production outside the top few is thin and unpredictable -- stream the position and spend picks elsewhere."}`,
    BALANCED: "Take the best player available each round without overcommitting to one position path -- flexible and forgiving of early-round runs.",
  };

  const positionPriorities: Record<StrategyType, Position[]> = {
    ZERO_RB: ["WR", "WR", "TE", "RB", "RB", "QB"],
    HERO_RB: ["RB", "WR", "WR", "TE", "RB", "QB"],
    ROBUST_RB: ["RB", "RB", "WR", "RB", "WR", "QB"],
    ZERO_WR: ["RB", "RB", "TE", "WR", "WR", "QB"],
    HERO_WR: ["WR", "RB", "RB", "WR", "TE", "QB"],
    LATE_ROUND_QB: ["RB", "WR", "WR", "RB", "TE", "QB"],
    EARLY_QB: ["QB", "RB", "WR", "WR", "RB", "TE"],
    ELITE_TE: ["TE", "RB", "WR", "RB", "WR", "QB"],
    LATE_ROUND_TE: ["RB", "WR", "RB", "WR", "QB", "TE"],
    BALANCED: ["RB", "WR", "RB", "WR", "TE", "QB"],
  };

  return (Object.keys(scores) as StrategyType[])
    .map((strategy) => ({
      strategy,
      fitScore: scores[strategy],
      reasoning: reasoningFor[strategy],
      positionPriorities: positionPriorities[strategy],
      earlyRoundPlan: `Rounds 1-3: target ${positionPriorities[strategy].slice(0, 3).join(", ")}.`,
      lateRoundTargets: strategy === "LATE_ROUND_QB" || strategy === "EARLY_QB" ? "Stream/handcuff QB value in the double-digit rounds." : "Prioritize upside handcuffs, breakout-candidate rookies, and your weakest starting slot.",
    }))
    .sort((a, b) => b.fitScore - a.fitScore);
}
