/**
 * Removes the generated demo/seed dataset (Player.dataSource === "SEED"),
 * leaving only real, live-provider-sourced players. Draft/MockDraft/
 * DraftPick/Roster/RosterPlayer/Trade rows are cleared first since
 * DraftPick.playerId has no cascade and would otherwise block deletion of
 * any demo player picked in a mock/live draft during testing.
 *
 * Usage: npx tsx scripts/remove-demo-players.ts
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();

  const demoCountBefore = await prisma.player.count({ where: { dataSource: "SEED" } });
  const realCountBefore = await prisma.player.count({ where: { dataSource: "PROVIDER" } });
  console.log(`Before: ${demoCountBefore} demo players, ${realCountBefore} real players.`);

  console.log("Clearing draft/roster/trade history (references players, no cascade on DraftPick)...");
  const draftPicks = await prisma.draftPick.deleteMany({});
  const mockDrafts = await prisma.mockDraft.deleteMany({});
  const drafts = await prisma.draft.deleteMany({});
  const rosterPlayers = await prisma.rosterPlayer.deleteMany({});
  const rosters = await prisma.roster.deleteMany({});
  const trades = await prisma.trade.deleteMany({});
  const savedPlayers = await prisma.savedPlayer.deleteMany({});
  const userRankings = await prisma.userRanking.deleteMany({});
  const userTiers = await prisma.userTier.deleteMany({});
  console.log(
    `Cleared ${draftPicks.count} draft picks, ${mockDrafts.count} mock drafts, ${drafts.count} drafts, ` +
      `${rosterPlayers.count} roster players, ${rosters.count} rosters, ${trades.count} trades, ` +
      `${savedPlayers.count} saved players, ${userRankings.count} user rankings, ${userTiers.count} user tiers.`
  );

  console.log("Removing demo player data (PlayerSeason/RookieProfile/Ranking/Projection/ADP cascade automatically)...");
  const deleted = await prisma.player.deleteMany({ where: { dataSource: "SEED" } });
  console.log(`Deleted ${deleted.count} demo players.`);

  const demoCountAfter = await prisma.player.count({ where: { dataSource: "SEED" } });
  const realCountAfter = await prisma.player.count({ where: { dataSource: "PROVIDER" } });
  console.log(`After: ${demoCountAfter} demo players, ${realCountAfter} real players.`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
