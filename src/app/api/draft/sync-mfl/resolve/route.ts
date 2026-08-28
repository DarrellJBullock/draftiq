import type { NextRequest } from "next/server";
import { withValidation } from "@/lib/api-helpers";
import { resolveMflPickSchema } from "@/lib/validation/draft";
import { resolveMflPick } from "@/lib/queries/mfl-sync";

export async function POST(req: NextRequest) {
  return withValidation(async () => {
    const body = resolveMflPickSchema.parse(await req.json());
    return resolveMflPick(body.draftId, body);
  });
}
