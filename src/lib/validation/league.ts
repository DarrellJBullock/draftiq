import { z } from "zod";
import { scoringFormatSchema } from "./common";

export const leagueSettingsSchema = z.object({
  passingTDPoints: z.number().default(4),
  passingYardPoints: z.number().default(0.04),
  interceptionPoints: z.number().default(-2),
  rushingTDPoints: z.number().default(6),
  rushingYardPoints: z.number().default(0.1),
  receivingTDPoints: z.number().default(6),
  receivingYardPoints: z.number().default(0.1),
  receptionPoints: z.number().default(0.5),
  tePremiumBonus: z.number().default(0),
  benchSize: z.number().int().min(0).max(20).default(6),
  qbSlots: z.number().int().min(0).max(3).default(1),
  rbSlots: z.number().int().min(0).max(6).default(2),
  wrSlots: z.number().int().min(0).max(6).default(2),
  teSlots: z.number().int().min(0).max(4).default(1),
  flexSlots: z.number().int().min(0).max(4).default(1),
  superflexSlots: z.number().int().min(0).max(2).default(0),
  kSlot: z.boolean().default(true),
  dstSlot: z.boolean().default(true),
});

export const createLeagueSchema = z.object({
  name: z.string().min(1).max(80),
  teamCount: z.number().int().min(4).max(20).default(12),
  scoringFormatPreset: scoringFormatSchema.default("PPR"),
  settings: leagueSettingsSchema.partial().optional(),
});

export const mflConfigSchema = z.object({
  mflLeagueId: z
    .string()
    .trim()
    .regex(/^\d+$/, "MFL league ID is numeric")
    .or(z.literal(""))
    .transform((v) => v || null),
  mflHost: z
    .string()
    .trim()
    .regex(/^www\d+$/, 'Host looks like "www45"')
    .or(z.literal(""))
    .transform((v) => v || null),
});

export type LeagueSettingsInput = z.infer<typeof leagueSettingsSchema>;
export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;
export type MflConfigInput = z.infer<typeof mflConfigSchema>;
