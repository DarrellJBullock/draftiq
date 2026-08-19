import { z } from "zod";

export const positionSchema = z.enum(["QB", "RB", "WR", "TE", "K", "DST"]);
export const scoringFormatSchema = z.enum(["STANDARD", "HALF_PPR", "PPR", "SUPERFLEX", "TE_PREMIUM", "CUSTOM"]);
export const injuryStatusSchema = z.enum(["HEALTHY", "QUESTIONABLE", "DOUBTFUL", "OUT", "IR", "PUP", "SUSPENDED"]);
export const riskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const draftModeSchema = z.enum(["SNAKE", "LINEAR", "AUCTION"]);
export const cpuPersonalitySchema = z.enum([
  "BPA",
  "ZERO_RB",
  "HERO_RB",
  "ZERO_WR",
  "EARLY_QB",
  "LATE_QB",
  "ELITE_TE",
  "ROOKIE_HEAVY",
  "ADP_FOCUSED",
  "SLEEPER_FOCUSED",
]);
export const strategyTypeSchema = z.enum([
  "ZERO_RB",
  "HERO_RB",
  "ROBUST_RB",
  "ZERO_WR",
  "HERO_WR",
  "LATE_ROUND_QB",
  "EARLY_QB",
  "ELITE_TE",
  "LATE_ROUND_TE",
  "BALANCED",
]);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const seasonYearSchema = z.coerce.number().int().min(2000).max(2100);
