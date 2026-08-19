import type { Position } from "@prisma/client";
import { jitter, randFloat, randInt, pick } from "./rng";
import { COLLEGES, HOMETOWNS, uniqueFullName } from "./names";
import type { SeedTeam } from "./teams";

export interface GeneratedPlayer {
  firstName: string;
  lastName: string;
  position: Position;
  teamAbbreviation: string;
  jerseyNumber: number | null;
  college: string | null;
  age: number | null;
  heightInches: number | null;
  weightLbs: number | null;
  yearsExperience: number;
  isRookie: boolean;
  isFreeAgent: boolean;
  returningFromInjury: boolean;
  injuryStatus: "HEALTHY" | "QUESTIONABLE" | "DOUBTFUL" | "OUT" | "IR" | "PUP" | "SUSPENDED";
  /** 0-1 internal fantasy-quality score driving downstream rank/ADP/projections. Not persisted. */
  quality: number;
  /** Slot label for readable seed output, e.g. "RB1". Not persisted. */
  depthSlot: string;
}

const HEIGHT_RANGE: Record<Position, [number, number]> = {
  QB: [72, 78],
  RB: [67, 73],
  WR: [69, 76],
  TE: [75, 80],
  K: [70, 75],
  DST: [70, 75],
};

const WEIGHT_RANGE: Record<Position, [number, number]> = {
  QB: [210, 240],
  RB: [195, 230],
  WR: [175, 220],
  TE: [240, 265],
  K: [180, 210],
  DST: [180, 210],
};

interface SlotSpec {
  position: Position;
  depthSlot: string;
  qualityRange: [number, number];
}

const ROSTER_SPEC: SlotSpec[] = [
  { position: "QB", depthSlot: "QB1", qualityRange: [0.55, 0.98] },
  { position: "QB", depthSlot: "QB2", qualityRange: [0.05, 0.35] },
  { position: "RB", depthSlot: "RB1", qualityRange: [0.55, 0.97] },
  { position: "RB", depthSlot: "RB2", qualityRange: [0.35, 0.65] },
  { position: "RB", depthSlot: "RB3", qualityRange: [0.1, 0.4] },
  { position: "WR", depthSlot: "WR1", qualityRange: [0.6, 0.98] },
  { position: "WR", depthSlot: "WR2", qualityRange: [0.45, 0.75] },
  { position: "WR", depthSlot: "WR3", qualityRange: [0.25, 0.55] },
  { position: "WR", depthSlot: "WR4", qualityRange: [0.05, 0.3] },
  { position: "TE", depthSlot: "TE1", qualityRange: [0.45, 0.9] },
  { position: "TE", depthSlot: "TE2", qualityRange: [0.05, 0.3] },
  { position: "K", depthSlot: "K1", qualityRange: [0.3, 0.7] },
];

export function generateVeteranRoster(
  rand: () => number,
  team: SeedTeam
): GeneratedPlayer[] {
  const players: GeneratedPlayer[] = [];

  for (const slot of ROSTER_SPEC) {
    const { firstName, lastName } = uniqueFullName(rand);
    const quality = clamp01(randFloat(rand, slot.qualityRange[0], slot.qualityRange[1], 3) + jitter(rand, 0.05));
    const age = randInt(rand, 22, 34);
    const yearsExperience = Math.max(0, age - 22 + randInt(rand, -1, 1));
    const [hMin, hMax] = HEIGHT_RANGE[slot.position];
    const [wMin, wMax] = WEIGHT_RANGE[slot.position];

    const injuryRoll = rand();
    const injuryStatus =
      injuryRoll > 0.94 ? "OUT" : injuryRoll > 0.88 ? "QUESTIONABLE" : injuryRoll > 0.85 ? "DOUBTFUL" : "HEALTHY";

    players.push({
      firstName,
      lastName,
      position: slot.position,
      teamAbbreviation: team.abbreviation,
      jerseyNumber: randInt(rand, 1, 99),
      college: pick(rand, COLLEGES),
      age,
      heightInches: randInt(rand, hMin, hMax),
      weightLbs: randInt(rand, wMin, wMax),
      yearsExperience,
      isRookie: false,
      isFreeAgent: false,
      returningFromInjury: rand() > 0.9,
      injuryStatus,
      quality,
      depthSlot: slot.depthSlot,
    });
  }

  // Team defense/special teams unit, modeled as a single DST player.
  const dstQuality = clamp01(randFloat(rand, 0.3, 0.78, 3));
  players.push({
    firstName: team.city,
    lastName: `${team.name} D/ST`,
    position: "DST",
    teamAbbreviation: team.abbreviation,
    jerseyNumber: null,
    college: null,
    age: null,
    heightInches: null,
    weightLbs: null,
    yearsExperience: randInt(rand, 1, 15),
    isRookie: false,
    isFreeAgent: false,
    returningFromInjury: false,
    injuryStatus: "HEALTHY",
    quality: dstQuality,
    depthSlot: "DST",
  });

  return players;
}

export function generateFreeAgents(rand: () => number, count: number): GeneratedPlayer[] {
  const positions: Position[] = ["QB", "RB", "WR", "TE", "K"];
  const players: GeneratedPlayer[] = [];
  for (let i = 0; i < count; i++) {
    const position = pick(rand, positions);
    const { firstName, lastName } = uniqueFullName(rand);
    const [hMin, hMax] = HEIGHT_RANGE[position];
    const [wMin, wMax] = WEIGHT_RANGE[position];
    players.push({
      firstName,
      lastName,
      position,
      teamAbbreviation: "",
      jerseyNumber: null,
      college: pick(rand, COLLEGES),
      age: randInt(rand, 24, 33),
      heightInches: randInt(rand, hMin, hMax),
      weightLbs: randInt(rand, wMin, wMax),
      yearsExperience: randInt(rand, 1, 10),
      isRookie: false,
      isFreeAgent: true,
      returningFromInjury: rand() > 0.7,
      injuryStatus: "HEALTHY",
      quality: clamp01(randFloat(rand, 0.05, 0.3, 3)),
      depthSlot: "FA",
    });
  }
  return players;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export { HOMETOWNS };
