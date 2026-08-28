import { z } from "zod";
import { cpuPersonalitySchema, draftModeSchema, scoringFormatSchema, strategyTypeSchema } from "./common";

/** A player pre-assigned to a team from a prior season -- kept, not drafted. */
export const keeperSchema = z.object({
  teamSlot: z.number().int().min(1),
  playerId: z.string(),
});
export type KeeperInput = z.infer<typeof keeperSchema>;

export const simulateDraftSchema = z.object({
  season: z.number().int(),
  leagueId: z.string().optional(),
  /** For a league split into independently-drafted groups (e.g. "NFC"/"AFC"); omit for a single-draft league. */
  conference: z.string().min(1).max(40).optional(),
  teamCount: z.number().int().min(4).max(20).default(12),
  rounds: z.number().int().min(1).max(25).default(16),
  draftPosition: z.number().int().min(1),
  mode: draftModeSchema.default("SNAKE"),
  scoringFormat: scoringFormatSchema.default("PPR"),
  userStrategy: strategyTypeSchema.optional(),
  cpuPersonalities: z.array(cpuPersonalitySchema).optional(),
  keepers: z.array(keeperSchema).default([]),
});

export type SimulateDraftInput = z.infer<typeof simulateDraftSchema>;

export const draftPickSchema = z.object({
  draftId: z.string().optional(),
  playerId: z.string(),
  teamSlot: z.number().int().min(1).optional(),
  // Setup fields, used only to create a new live draft on the first call.
  leagueId: z.string().optional(),
  conference: z.string().min(1).max(40).optional(),
  season: z.number().int().optional(),
  teamCount: z.number().int().min(4).max(20).optional(),
  rounds: z.number().int().min(1).max(25).optional(),
  draftPosition: z.number().int().min(1).optional(),
  mode: draftModeSchema.optional(),
});

export type DraftPickInput = z.infer<typeof draftPickSchema>;

export const addKeeperSchema = z.object({
  draftId: z.string().optional(),
  playerId: z.string(),
  teamSlot: z.number().int().min(1),
  // Setup fields, used only to create a new live draft on the first call.
  leagueId: z.string().optional(),
  conference: z.string().min(1).max(40).optional(),
  season: z.number().int().optional(),
  teamCount: z.number().int().min(4).max(20).optional(),
  rounds: z.number().int().min(1).max(25).optional(),
  draftPosition: z.number().int().min(1).optional(),
  mode: draftModeSchema.optional(),
});

export type AddKeeperInput = z.infer<typeof addKeeperSchema>;

export const mflSyncSchema = z.object({
  draftId: z.string(),
});
export type MflSyncInput = z.infer<typeof mflSyncSchema>;

export const resolveMflPickSchema = z.object({
  draftId: z.string(),
  round: z.number().int().min(1),
  pickInRound: z.number().int().min(1),
  teamSlot: z.number().int().min(1),
  playerId: z.string(),
});
export type ResolveMflPickInput = z.infer<typeof resolveMflPickSchema>;

export const draftRecommendationQuerySchema = z.object({
  draftId: z.string().optional(),
  season: z.number().int(),
  scoringFormat: scoringFormatSchema.default("PPR"),
  teamCount: z.number().int().min(4).max(20).default(12),
  rosterPlayerIds: z.array(z.string()).default([]),
  draftedPlayerIds: z.array(z.string()).default([]),
  round: z.number().int().min(1).default(1),
  focusPlayerId: z.string().optional(),
});

export type DraftRecommendationQuery = z.infer<typeof draftRecommendationQuerySchema>;
