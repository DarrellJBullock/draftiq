import type { NextRequest } from "next/server";
import { withValidation } from "@/lib/api-helpers";
import { addKeeperSchema } from "@/lib/validation/draft";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { addKeeper } from "@/lib/queries/drafts";

export async function POST(req: NextRequest) {
  return withValidation(async () => {
    const body = addKeeperSchema.parse(await req.json());
    const user = await getCurrentUserOrDemo();
    return addKeeper(user.id, body);
  });
}
