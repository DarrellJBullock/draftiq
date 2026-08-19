import { z } from "zod";
import { scoringFormatSchema } from "./common";

export const aiAnalyzeSchema = z.object({
  question: z.string().min(1).max(2000),
  season: z.number().int(),
  scoringFormat: scoringFormatSchema.default("PPR"),
  leagueId: z.string().optional(),
  draftId: z.string().optional(),
  conversationId: z.string().optional(),
});

export type AIAnalyzeInput = z.infer<typeof aiAnalyzeSchema>;
