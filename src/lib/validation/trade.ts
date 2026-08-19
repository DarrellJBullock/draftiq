import { z } from "zod";
import { scoringFormatSchema } from "./common";

export const analyzeTradeSchema = z.object({
  season: z.number().int(),
  scoringFormat: scoringFormatSchema.default("PPR"),
  sideAPlayerIds: z.array(z.string()).min(1),
  sideBPlayerIds: z.array(z.string()).min(1),
  leagueId: z.string().optional(),
});

export type AnalyzeTradeInput = z.infer<typeof analyzeTradeSchema>;
