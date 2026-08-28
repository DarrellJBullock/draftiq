import type { NextRequest } from "next/server";
import { withValidation } from "@/lib/api-helpers";
import { mflSyncSchema } from "@/lib/validation/draft";
import { syncDraftFromMfl } from "@/lib/queries/mfl-sync";

export async function POST(req: NextRequest) {
  return withValidation(async () => {
    const body = mflSyncSchema.parse(await req.json());
    return syncDraftFromMfl(body.draftId);
  });
}
