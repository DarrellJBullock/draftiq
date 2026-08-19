import type { NextRequest } from "next/server";
import { withValidation } from "@/lib/api-helpers";
import { syncPlayersSchema } from "@/lib/validation/sync";
import { syncPlayersFromProvider } from "@/lib/services/providers/sync";

export async function POST(req: NextRequest) {
  return withValidation(async () => {
    const body = syncPlayersSchema.parse(await req.json());
    return syncPlayersFromProvider(body.provider, body.seasonYear);
  });
}
