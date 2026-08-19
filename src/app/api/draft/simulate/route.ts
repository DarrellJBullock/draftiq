import type { NextRequest } from "next/server";
import { withValidation } from "@/lib/api-helpers";
import { simulateDraftSchema } from "@/lib/validation/draft";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { runAndPersistMockDraft } from "@/lib/queries/drafts";

export async function POST(req: NextRequest) {
  return withValidation(async () => {
    const body = simulateDraftSchema.parse(await req.json());
    const user = await getCurrentUserOrDemo();
    return runAndPersistMockDraft(user.id, body);
  });
}
