import { z } from "zod";
import { seasonYearSchema } from "./common";

export const syncPlayersSchema = z.object({
  provider: z.string().min(1),
  seasonYear: seasonYearSchema,
});

export type SyncPlayersInput = z.infer<typeof syncPlayersSchema>;
