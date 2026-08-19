import type { NextRequest } from "next/server";
import { withValidation } from "@/lib/api-helpers";
import { draftPickSchema } from "@/lib/validation/draft";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { submitDraftPick } from "@/lib/queries/drafts";

export async function POST(req: NextRequest) {
  return withValidation(async () => {
    const body = draftPickSchema.parse(await req.json());
    const user = await getCurrentUserOrDemo();
    return submitDraftPick(user.id, body);
  });
}
