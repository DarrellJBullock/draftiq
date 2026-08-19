import type { Position, ScoringFormatPreset } from "@prisma/client";
import { randFloat, randInt } from "./rng";

export interface StatLine {
  games: number;
  attempts?: number;
  completions?: number;
  passingYards?: number;
  passingTDs?: number;
  interceptions?: number;
  rushAttempts?: number;
  rushingYards?: number;
  rushingTDs?: number;
  targets?: number;
  receptions?: number;
  receivingYards?: number;
  receivingTDs?: number;
  fieldGoalsMade?: number;
  extraPointsMade?: number;
  sacks?: number;
  defensiveInterceptions?: number;
  fumbleRecoveries?: number;
  defensiveTDs?: number;
  safeties?: number;
  pointsAllowedPerGame?: number;
}

/** Format-agnostic season statline driven by a 0-1 quality score. */
export function generateStatLine(rand: () => number, position: Position, quality: number): StatLine {
  const games = randInt(rand, 13, 17);
  const gameFactor = games / 17;

  switch (position) {
    case "QB": {
      const passingYards = Math.round((2600 + quality * 2400) * gameFactor);
      const passingTDs = Math.round((12 + quality * 30) * gameFactor);
      const interceptions = Math.round((14 - quality * 8) * gameFactor);
      const attempts = Math.round(passingYards / randFloat(rand, 6.8, 8.2));
      const completions = Math.round(attempts * randFloat(rand, 0.6, 0.71));
      const rushingYards = Math.round(randFloat(rand, 30, 550) * (0.4 + quality * 0.6));
      const rushingTDs = Math.round(quality * randFloat(rand, 0, 6));
      return { games, attempts, completions, passingYards, passingTDs, interceptions, rushingYards, rushingTDs };
    }
    case "RB": {
      const rushAttempts = Math.round((30 + quality * 270) * gameFactor);
      const ypc = randFloat(rand, 3.7, 4.9);
      const rushingYards = Math.round(rushAttempts * ypc);
      const rushingTDs = Math.round(quality * randFloat(rand, 2, 13));
      const targets = Math.round((8 + quality * 65) * gameFactor);
      const receptions = Math.round(targets * randFloat(rand, 0.68, 0.8));
      const receivingYards = Math.round(receptions * randFloat(rand, 6.5, 9.5));
      const receivingTDs = Math.round(quality * randFloat(rand, 0, 3));
      return { games, rushAttempts, rushingYards, rushingTDs, targets, receptions, receivingYards, receivingTDs };
    }
    case "WR": {
      const targets = Math.round((15 + quality * 140) * gameFactor);
      const receptions = Math.round(targets * randFloat(rand, 0.55, 0.72));
      const receivingYards = Math.round(receptions * randFloat(rand, 11, 15));
      const receivingTDs = Math.round(quality * randFloat(rand, 0, 11));
      const rushingYards = Math.round(randFloat(rand, 0, 40) * (rand() > 0.75 ? 1 : 0));
      return { games, targets, receptions, receivingYards, receivingTDs, rushingYards, rushAttempts: rushingYards > 0 ? Math.round(rushingYards / 6) : 0 };
    }
    case "TE": {
      const targets = Math.round((10 + quality * 100) * gameFactor);
      const receptions = Math.round(targets * randFloat(rand, 0.6, 0.72));
      const receivingYards = Math.round(receptions * randFloat(rand, 9, 12.5));
      const receivingTDs = Math.round(quality * randFloat(rand, 0, 8));
      return { games, targets, receptions, receivingYards, receivingTDs };
    }
    case "K": {
      const fieldGoalsMade = Math.round((16 + quality * 14) * gameFactor);
      const extraPointsMade = Math.round((22 + quality * 18) * gameFactor);
      return { games, fieldGoalsMade, extraPointsMade };
    }
    case "DST": {
      // Standard-format defense scoring categories: sacks, takeaways
      // (interceptions + fumble recoveries), defensive/return TDs, safeties,
      // plus a points-allowed-per-game figure used by fantasyPointsFor to
      // apply the usual tiered points-allowed bonus/penalty.
      const sacks = Math.round((28 + quality * 24) * gameFactor);
      const defensiveInterceptions = Math.round((6 + quality * 12) * gameFactor);
      const fumbleRecoveries = Math.round((5 + quality * 8) * gameFactor);
      const defensiveTDs = Math.round(quality * randFloat(rand, 0, 4));
      const safeties = rand() > 1 - quality * 0.3 ? 1 : 0;
      const pointsAllowedPerGame = Math.round((28 - quality * 14) * 10) / 10;
      return { games, sacks, defensiveInterceptions, fumbleRecoveries, defensiveTDs, safeties, pointsAllowedPerGame };
    }
    default:
      return { games };
  }
}

const RECEPTION_POINTS: Record<ScoringFormatPreset, number> = {
  STANDARD: 0,
  HALF_PPR: 0.5,
  PPR: 1,
  SUPERFLEX: 0.5,
  TE_PREMIUM: 1,
  CUSTOM: 0.5,
};

export function fantasyPointsFor(stat: StatLine, format: ScoringFormatPreset, position?: Position): number {
  const receptionPoints =
    format === "TE_PREMIUM" && position === "TE" ? 1.5 : RECEPTION_POINTS[format] ?? 0.5;

  let points = 0;
  points += (stat.passingYards ?? 0) * 0.04;
  points += (stat.passingTDs ?? 0) * 4;
  points -= (stat.interceptions ?? 0) * 2;
  points += (stat.rushingYards ?? 0) * 0.1;
  points += (stat.rushingTDs ?? 0) * 6;
  points += (stat.receivingYards ?? 0) * 0.1;
  points += (stat.receivingTDs ?? 0) * 6;
  points += (stat.receptions ?? 0) * receptionPoints;
  points += (stat.fieldGoalsMade ?? 0) * 3;
  points += (stat.extraPointsMade ?? 0) * 1;
  points += (stat.sacks ?? 0) * 1;
  points += (stat.defensiveInterceptions ?? 0) * 2;
  points += (stat.fumbleRecoveries ?? 0) * 2;
  points += (stat.defensiveTDs ?? 0) * 6;
  points += (stat.safeties ?? 0) * 2;
  if (stat.pointsAllowedPerGame !== undefined) {
    points += pointsAllowedBonus(stat.pointsAllowedPerGame) * (stat.games ?? 17);
  }
  return Math.round(points * 10) / 10;
}

/** Standard tiered points-allowed-per-game bonus/penalty used in most DST scoring formats. */
function pointsAllowedBonus(pointsAllowedPerGame: number): number {
  if (pointsAllowedPerGame <= 0) return 10;
  if (pointsAllowedPerGame <= 6) return 7;
  if (pointsAllowedPerGame <= 13) return 4;
  if (pointsAllowedPerGame <= 20) return 1;
  if (pointsAllowedPerGame <= 27) return 0;
  if (pointsAllowedPerGame <= 34) return -1;
  return -4;
}

export function floorCeiling(median: number, position: Position): { floor: number; median: number; ceiling: number } {
  const spread: Record<Position, [number, number]> = {
    QB: [0.78, 1.28],
    RB: [0.62, 1.42],
    WR: [0.6, 1.45],
    TE: [0.58, 1.5],
    K: [0.75, 1.25],
    DST: [0.65, 1.4],
  };
  const [lo, hi] = spread[position];
  return {
    floor: Math.max(0, Math.round(median * lo * 10) / 10),
    median: Math.round(median * 10) / 10,
    ceiling: Math.round(median * hi * 10) / 10,
  };
}
