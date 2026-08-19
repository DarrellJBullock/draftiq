/**
 * One-off setup: renames the default demo league to "NFC" and creates a
 * matching "AFC" league (both 13 teams, PPR, same roster construction),
 * for a 26-team league split into two independently-drafted conferences.
 *
 * Usage: npx tsx scripts/setup-conference-leagues.ts
 */
import { prisma } from "../src/lib/db/prisma";
import { updateLeague, createLeague } from "../src/lib/queries/leagues";

async function main() {
  // getCurrentUserOrDemo() relies on Next's cookies() API, which only works
  // inside a request -- go straight to the seeded demo user here instead.
  const user = await prisma.user.findUniqueOrThrow({ where: { email: "demo@draftiq.app" } });
  const existing = await prisma.league.findFirst({ where: { userId: user.id, name: "The Demo League" } });

  if (existing) {
    const nfc = await updateLeague(existing.id, { name: "NFC", teamCount: 13, scoringFormatPreset: "PPR" });
    console.log("Renamed existing league to NFC:", nfc.id, nfc.name, nfc.teamCount);
  } else {
    console.log("No 'The Demo League' found -- skipping rename.");
  }

  const afc = await createLeague(user.id, { name: "AFC", teamCount: 13, scoringFormatPreset: "PPR" });
  console.log("Created AFC league:", afc.id, afc.name, afc.teamCount);

  const leagues = await prisma.league.findMany({ where: { userId: user.id }, include: { settings: true } });
  console.log(
    "All leagues:",
    leagues.map((l) => ({
      name: l.name,
      teamCount: l.teamCount,
      rosterSlots: l.settings
        ? l.settings.qbSlots + l.settings.rbSlots + l.settings.wrSlots + l.settings.teSlots + l.settings.flexSlots + l.settings.superflexSlots + (l.settings.kSlot ? 1 : 0) + (l.settings.dstSlot ? 1 : 0) + l.settings.benchSize
        : null,
    }))
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
