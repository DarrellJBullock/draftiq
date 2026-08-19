import type { NextRequest } from "next/server";
import { withValidation } from "@/lib/api-helpers";
import { analyzeTradeSchema } from "@/lib/validation/trade";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { analyzeAndSaveTrade } from "@/lib/queries/trades";

export async function POST(req: NextRequest) {
  return withValidation(async () => {
    const body = analyzeTradeSchema.parse(await req.json());
    const user = await getCurrentUserOrDemo();
    return analyzeAndSaveTrade(user.id, body);
  });
}
