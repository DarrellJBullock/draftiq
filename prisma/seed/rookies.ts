import type { Position } from "@prisma/client";
import { randFloat, randInt, pick } from "./rng";
import { COLLEGES, uniqueFullName } from "./names";
import { generateStatLine, fantasyPointsFor, floorCeiling } from "./statlines";
import type { StatLine } from "./statlines";
import type { GeneratedPlayer } from "./players";

export interface GeneratedRookie {
  player: GeneratedPlayer;
  stat: StatLine;
  draftRound: number;
  draftPick: number;
  rookieTier: number;
  fantasyPositionRank: number;
  overallFantasyRank: number;
  projectedGames: number;
  projectedAttempts: number | null;
  projectedReceptions: number | null;
  projectedTargets: number | null;
  projectedRushingYards: number | null;
  projectedReceivingYards: number | null;
  projectedTouchdowns: number;
  projectedFantasyPoints: number;
  floor: number;
  median: number;
  ceiling: number;
  opportunityScore: number;
  competitionScore: number;
  landingSpotScore: number;
  breakoutScore: number;
  analystNotes: string;
}

// How many rookies to generate per position, and how their draft rounds
// tend to be distributed (weights sum arbitrarily, only relative size matters).
const CLASS_SPEC: Record<Position, { count: number; roundWeights: number[] }> = {
  QB: { count: 7, roundWeights: [0.2, 0.15, 0.1, 0.15, 0.15, 0.15, 0.1] },
  RB: { count: 14, roundWeights: [0.06, 0.14, 0.2, 0.2, 0.16, 0.14, 0.1] },
  WR: { count: 20, roundWeights: [0.16, 0.2, 0.2, 0.14, 0.1, 0.1, 0.1] },
  TE: { count: 9, roundWeights: [0.05, 0.1, 0.15, 0.2, 0.2, 0.15, 0.15] },
  K: { count: 0, roundWeights: [] },
  DST: { count: 0, roundWeights: [] },
};

function weightedRound(rand: () => number, weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return i + 1;
  }
  return weights.length;
}

const LANDING_SPOT_NOTES = [
  "steps into a wide-open target share with the WR2 job unsettled",
  "lands behind a veteran but on a clear timeline to take over within a year",
  "joins an offense that funnels volume to this position early",
  "faces a crowded depth chart that will cap early-season touches",
  "benefits from an offensive coordinator with a strong track record developing this position",
  "walks into a committee that could limit weekly ceiling",
];

const TRAIT_NOTES: Record<Position, string[]> = {
  QB: ["plus arm talent with room to grow as a decision-maker", "high-floor game manager profile with rushing upside", "big-play thrower who needs pocket refinement"],
  RB: ["three-down skill set with pass-protection polish", "explosive change-of-direction athlete best in space", "power runner who profiles as a between-the-tackles bell cow"],
  WR: ["route-running technician who wins early on timing throws", "vertical field-stretcher with home-run speed", "possession target with strong hands in contested catches"],
  TE: ["athletic mismatch piece who can split out wide", "in-line blocker adding receiving value as a bonus", "big slot weapon with reliable hands over the middle"],
  K: [],
  DST: [],
};

export function generateRookieClass(rand: () => number, teamAbbreviations: string[]): GeneratedRookie[] {
  const rookies: GeneratedRookie[] = [];
  const usedOverallPicks = new Set<number>();

  (Object.keys(CLASS_SPEC) as Position[]).forEach((position) => {
    const spec = CLASS_SPEC[position];
    for (let i = 0; i < spec.count; i++) {
      const round = weightedRound(rand, spec.roundWeights);
      let overallPick = (round - 1) * 32 + randInt(rand, 1, 32);
      while (usedOverallPicks.has(overallPick)) overallPick++;
      usedOverallPicks.add(overallPick);

      // Earlier picks -> higher quality, with noise so capital isn't destiny.
      const capitalScore = Math.max(0, 1 - overallPick / 260);
      const quality = clamp01(capitalScore * 0.7 + randFloat(rand, 0, 0.3, 3));

      const { firstName, lastName } = uniqueFullName(rand);
      const teamAbbreviation = pick(rand, teamAbbreviations);
      const age = randInt(rand, 21, 23);

      const stat = generateStatLine(rand, position, quality * 0.75); // rookies discounted vs veteran peak
      const medianPts = fantasyPointsFor(stat, "PPR", position);
      const { floor, median, ceiling } = floorCeiling(medianPts, position);

      const opportunityScore = round1to100(capitalScore * 0.5 + quality * 0.5, rand);
      const competitionScore = round1to100(1 - rand() * (1 - capitalScore * 0.6), rand);
      const landingSpotScore = round1to100(clamp01(quality * 0.6 + rand() * 0.4), rand);
      const breakoutScore = round1to100(clamp01(quality * 0.55 + (1 - competitionScore / 100) * 0.25 + rand() * 0.2), rand);

      const college = pick(rand, COLLEGES);
      const landingNote = pick(rand, LANDING_SPOT_NOTES);
      const traitPool = TRAIT_NOTES[position];
      const traitNote = traitPool.length ? pick(rand, traitPool) : "";

      const player: GeneratedPlayer = {
        firstName,
        lastName,
        position,
        teamAbbreviation,
        jerseyNumber: randInt(rand, 1, 99),
        college,
        age,
        heightInches: heightFor(position, rand),
        weightLbs: weightFor(position, rand),
        yearsExperience: 0,
        isRookie: true,
        isFreeAgent: false,
        returningFromInjury: false,
        injuryStatus: "HEALTHY",
        quality,
        depthSlot: "ROOKIE",
      };

      rookies.push({
        player,
        stat,
        draftRound: round,
        draftPick: overallPick,
        rookieTier: 0, // assigned after sorting
        fantasyPositionRank: 0,
        overallFantasyRank: 0,
        projectedGames: stat.games,
        projectedAttempts: stat.rushAttempts ?? (position === "QB" ? stat.attempts ?? null : null),
        projectedReceptions: stat.receptions ?? null,
        projectedTargets: stat.targets ?? null,
        projectedRushingYards: stat.rushingYards ?? null,
        projectedReceivingYards: stat.receivingYards ?? null,
        projectedTouchdowns: (stat.rushingTDs ?? 0) + (stat.receivingTDs ?? 0) + (stat.passingTDs ?? 0),
        projectedFantasyPoints: medianPts,
        floor,
        median,
        ceiling,
        opportunityScore,
        competitionScore,
        landingSpotScore,
        breakoutScore,
        analystNotes: `${firstName} ${lastName} (${college}, Round ${round}) ${landingNote}${traitNote ? `; ${traitNote}.` : "."}`,
      });
    }
  });

  // Assign position ranks and rookie tiers from generated quality/points.
  (Object.keys(CLASS_SPEC) as Position[]).forEach((position) => {
    const group = rookies.filter((r) => r.player.position === position).sort((a, b) => b.projectedFantasyPoints - a.projectedFantasyPoints);
    group.forEach((r, idx) => {
      r.fantasyPositionRank = idx + 1;
      r.rookieTier = Math.min(4, Math.floor(idx / Math.max(1, Math.ceil(group.length / 4))) + 1);
    });
  });

  const byOverall = [...rookies].sort((a, b) => b.breakoutScore + b.landingSpotScore - (a.breakoutScore + a.landingSpotScore) || b.projectedFantasyPoints - a.projectedFantasyPoints);
  byOverall.forEach((r, idx) => {
    r.overallFantasyRank = idx + 1;
  });

  return rookies;
}

function round1to100(fraction: number, rand: () => number): number {
  return Math.round(clamp01(fraction) * 60 + randFloat(rand, 0, 40));
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function heightFor(position: Position, rand: () => number): number {
  const ranges: Partial<Record<Position, [number, number]>> = {
    QB: [72, 78],
    RB: [67, 73],
    WR: [69, 76],
    TE: [75, 80],
  };
  const [min, max] = ranges[position] ?? [70, 76];
  return randInt(rand, min, max);
}

function weightFor(position: Position, rand: () => number): number {
  const ranges: Partial<Record<Position, [number, number]>> = {
    QB: [210, 240],
    RB: [195, 230],
    WR: [175, 220],
    TE: [240, 265],
  };
  const [min, max] = ranges[position] ?? [190, 220];
  return randInt(rand, min, max);
}
