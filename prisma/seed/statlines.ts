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
    case "DST":
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
  return Math.round(points * 10) / 10;
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
