import type { NextRequest } from "next/server";
import { withValidation } from "@/lib/api-helpers";
import { aiAnalyzeSchema } from "@/lib/validation/ai";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { resolveSeason } from "@/lib/queries/resolve-season";
import { buildAIContext } from "@/lib/queries/ai-context";
import { getAIProvider } from "@/lib/services/ai";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  return withValidation(async () => {
    const body = aiAnalyzeSchema.parse(await req.json());
    const user = await getCurrentUserOrDemo();
    const [season, league] = await Promise.all([resolveSeason(body.season), getOrCreateDefaultLeague(user.id)]);

    const context = await buildAIContext(season.id, season.year, body.scoringFormat, {
      question: body.question,
      showDdaflAdjustment: !!league.mflLeagueId,
    });
    const provider = await getAIProvider();
    const response = await provider.analyze({ question: body.question, context });

    const conversation = body.conversationId
      ? await prisma.aIConversation.findUnique({ where: { id: body.conversationId } })
      : null;

    const newMessages = [
      ...((conversation?.messages as Array<{ role: string; content: string }>) ?? []),
      { role: "user", content: body.question, createdAt: new Date().toISOString() },
      { role: "assistant", content: response.recommendation, reasoning: response.reasoning, createdAt: new Date().toISOString() },
    ];

    const saved = conversation
      ? await prisma.aIConversation.update({ where: { id: conversation.id }, data: { messages: newMessages, seasonId: season.id } })
      : await prisma.aIConversation.create({
          data: { userId: user.id, seasonId: season.id, title: body.question.slice(0, 60), messages: newMessages },
        });

    return { ...response, conversationId: saved.id };
  });
}
