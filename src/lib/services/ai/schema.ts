import { z } from "zod";

export const aiResponseSchema = z.object({
  recommendation: z.string(),
  reasoning: z.string(),
  alternatives: z.array(z.string()),
  risk: z.string(),
  confidence: z.number().min(0).max(1),
});
