import { z } from "zod";
import { injuryStatusSchema, positionSchema, scoringFormatSchema } from "./common";

const boolFromString = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === "boolean" ? v : ["true", "1", "yes", "y"].includes(v.trim().toLowerCase())))
  .optional();

export const teamImportRowSchema = z.object({
  name: z.string().min(1),
  abbreviation: z
    .string()
    .min(2)
    .max(4)
    .transform((v) => v.toUpperCase()),
  city: z.string().min(1),
  conference: z.enum(["AFC", "NFC"]),
  division: z.enum(["East", "North", "South", "West"]),
  primaryColor: z.string().min(1),
  secondaryColor: z.string().min(1),
});

export const playerImportRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  position: positionSchema,
  nflTeamAbbreviation: z.string().optional(),
  jerseyNumber: z.coerce.number().int().min(0).max(99).optional(),
  college: z.string().optional(),
  age: z.coerce.number().int().min(18).max(50).optional(),
  heightInches: z.coerce.number().int().optional(),
  weightLbs: z.coerce.number().int().optional(),
  yearsExperience: z.coerce.number().int().min(0).optional(),
  isRookie: boolFromString,
  isFreeAgent: boolFromString,
  injuryStatus: injuryStatusSchema.optional(),
  byeWeek: z.coerce.number().int().min(1).max(18).optional(),
});

export const rankingImportRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  position: positionSchema,
  scoringFormat: scoringFormatSchema.default("PPR"),
  source: z.enum(["CONSENSUS", "EXPERT"]).default("CONSENSUS"),
  overallRank: z.coerce.number().int().min(1),
  positionRank: z.coerce.number().int().min(1),
});

export const adpImportRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  position: positionSchema,
  scoringFormat: scoringFormatSchema.default("PPR"),
  overallADP: z.coerce.number().min(0),
  positionADP: z.coerce.number().min(0).optional(),
  adpDelta: z.coerce.number().optional(),
});

export const projectionImportRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  position: positionSchema,
  scoringFormat: scoringFormatSchema.default("PPR"),
  games: z.coerce.number().optional(),
  attempts: z.coerce.number().optional(),
  completions: z.coerce.number().optional(),
  passingYards: z.coerce.number().optional(),
  passingTDs: z.coerce.number().optional(),
  interceptions: z.coerce.number().optional(),
  rushAttempts: z.coerce.number().optional(),
  rushingYards: z.coerce.number().optional(),
  rushingTDs: z.coerce.number().optional(),
  targets: z.coerce.number().optional(),
  receptions: z.coerce.number().optional(),
  receivingYards: z.coerce.number().optional(),
  receivingTDs: z.coerce.number().optional(),
  fieldGoalsMade: z.coerce.number().optional(),
  extraPointsMade: z.coerce.number().optional(),
  sacks: z.coerce.number().optional(),
  defensiveInterceptions: z.coerce.number().optional(),
  fumbleRecoveries: z.coerce.number().optional(),
  defensiveTDs: z.coerce.number().optional(),
  safeties: z.coerce.number().optional(),
  pointsAllowedPerGame: z.coerce.number().optional(),
  fantasyPoints: z.coerce.number().optional(),
  floor: z.coerce.number().optional(),
  median: z.coerce.number().optional(),
  ceiling: z.coerce.number().optional(),
});

export const rookieImportRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  position: positionSchema,
  nflTeamAbbreviation: z.string().optional(),
  college: z.string().optional(),
  age: z.coerce.number().int().optional(),
  draftRound: z.coerce.number().int().min(1).max(7).optional(),
  draftPick: z.coerce.number().int().min(1).optional(),
  rookieTier: z.coerce.number().int().min(1).max(4).optional(),
  fantasyPositionRank: z.coerce.number().int().min(1).optional(),
  overallFantasyRank: z.coerce.number().int().min(1).optional(),
  projectedFantasyPoints: z.coerce.number().optional(),
  floor: z.coerce.number().optional(),
  median: z.coerce.number().optional(),
  ceiling: z.coerce.number().optional(),
  opportunityScore: z.coerce.number().min(0).max(100).optional(),
  competitionScore: z.coerce.number().min(0).max(100).optional(),
  landingSpotScore: z.coerce.number().min(0).max(100).optional(),
  breakoutScore: z.coerce.number().min(0).max(100).optional(),
  analystNotes: z.string().optional(),
});

export const IMPORT_ROW_SCHEMAS = {
  teams: teamImportRowSchema,
  players: playerImportRowSchema,
  rankings: rankingImportRowSchema,
  adp: adpImportRowSchema,
  projections: projectionImportRowSchema,
  rookies: rookieImportRowSchema,
} as const;

export type ImportType = keyof typeof IMPORT_ROW_SCHEMAS;
export const IMPORT_TYPES = Object.keys(IMPORT_ROW_SCHEMAS) as ImportType[];
