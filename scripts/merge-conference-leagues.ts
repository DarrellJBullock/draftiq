/**
 * One-off migration: merges the separate "NFC" and "AFC" leagues (created by
 * an earlier, now-superseded setup) back into a single 26-team league. The
 * two conferences now live as a `conference` tag on each Draft instead of
 * as separate League rows -- shared scoring/roster settings, independently
 * run drafts.
 *
 * Usage: npx tsx scripts/merge-conference-leagues.ts
 */
import { prisma } from "../src/lib/db/prisma";
import { updateLeague } from "../src/lib/queries/leagues";

async function main() {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: "demo@draftiq.app" } });

  const nfc = await prisma.league.findFirst({ where: { userId: user.id, name: "NFC" } });
  const afc = await prisma.league.findFirst({ where: { userId: user.id, name: "AFC" } });

  if (!nfc) {
    console.log("No 'NFC' league found -- nothing to merge.");
    await prisma.$disconnect();
    return;
  }

  const merged = await updateLeague(nfc.id, { name: "NFC/AFC League", teamCount: 26, scoringFormatPreset: "PPR" });
  console.log("Merged into one 26-team league:", merged.id, merged.name, merged.teamCount);

  if (afc) {
    // Safe to delete outright: this league was only just created and has no
    // drafts/rosters/trades attached to it yet.
    const draftCount = await prisma.draft.count({ where: { leagueId: afc.id } });
    if (draftCount === 0) {
      await prisma.league.delete({ where: { id: afc.id } });
      console.log("Deleted the now-redundant standalone AFC league:", afc.id);
    } else {
      console.log(`AFC league (${afc.id}) has ${draftCount} draft(s) attached -- leaving it in place, review manually.`);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
