import { z } from "zod";
import { injuryStatusSchema, paginationSchema, positionSchema, riskLevelSchema, scoringFormatSchema } from "./common";

export const playerQuerySchema = paginationSchema.extend({
  season: z.coerce.number().int().optional(),
  position: positionSchema.optional(),
  team: z.string().optional(),
  rookie: z.coerce.boolean().optional(),
  veteran: z.coerce.boolean().optional(),
  freeAgent: z.coerce.boolean().optional(),
  injuryStatus: injuryStatusSchema.optional(),
  riskLevel: riskLevelSchema.optional(),
  scoringFormat: scoringFormatSchema.optional(),
  adpMin: z.coerce.number().optional(),
  adpMax: z.coerce.number().optional(),
  rankMax: z.coerce.number().int().optional(),
  tier: z.coerce.number().int().optional(),
  ageMax: z.coerce.number().int().optional(),
  byeWeek: z.coerce.number().int().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["overallRank", "adp", "fantasyPoints", "name"]).default("overallRank"),
});

export type PlayerQuery = z.infer<typeof playerQuerySchema>;

export const rookieQuerySchema = paginationSchema.extend({
  season: z.coerce.number().int().optional(),
  position: positionSchema.optional(),
  tier: z.coerce.number().int().optional(),
  sortBy: z.enum(["overallFantasyRank", "breakoutScore", "opportunityScore", "adp"]).default("overallFantasyRank"),
});

export type RookieQuery = z.infer<typeof rookieQuerySchema>;
