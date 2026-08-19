import { PrismaClient } from "@prisma/client";
import { mulberry32 } from "./seed/rng";
import { NFL_TEAMS, seedByeWeek } from "./seed/teams";
import { resetNamePool } from "./seed/names";
import { generateVeteranRoster, generateFreeAgents, type GeneratedPlayer } from "./seed/players";
import { generateRookieClass } from "./seed/rookies";
import { generateStatLine, type StatLine } from "./seed/statlines";
import { deriveSeedData, tierLabel, type DerivedPlayerInput } from "./seed/derive";

const prisma = new PrismaClient();
const SEASON_YEAR = 2026;
const SEED = 20260101;

async function main() {
  console.log(`Seeding DraftIQ demo data for the ${SEASON_YEAR} season...`);
  const rand = mulberry32(SEED);
  resetNamePool();

  // --- Reset previously-seeded data so this script is safely re-runnable ---
  // (Season/NFLTeam rows are upserted below and kept; everything derived from
  // players is deleted here, in FK-dependency order, then regenerated.)
  await prisma.draftPick.deleteMany({});
  await prisma.mockDraft.deleteMany({});
  await prisma.draft.deleteMany({});
  await prisma.rosterPlayer.deleteMany({});
  await prisma.roster.deleteMany({});
  await prisma.trade.deleteMany({});
  await prisma.savedPlayer.deleteMany({});
  await prisma.userRanking.deleteMany({});
  await prisma.userTier.deleteMany({});
  await prisma.aIConversation.deleteMany({});
  await prisma.leagueSettings.deleteMany({});
  await prisma.league.deleteMany({});
  await prisma.tier.deleteMany({});
  await prisma.aDP.deleteMany({});
  await prisma.projection.deleteMany({});
  await prisma.ranking.deleteMany({});
  await prisma.playerSeason.deleteMany({});
  await prisma.rookieProfile.deleteMany({});
  await prisma.player.deleteMany({});
  console.log("Cleared previously-seeded data.");

  // --- Season -------------------------------------------------------------
  const season = await prisma.season.upsert({
    where: { year: SEASON_YEAR },
    update: { isActive: true },
    create: { year: SEASON_YEAR, label: `${SEASON_YEAR} Fantasy Season`, isActive: true },
  });

  // --- NFL teams ------------------------------------------------------------
  const teamIdByAbbreviation = new Map<string, string>();
  for (const team of NFL_TEAMS) {
    const row = await prisma.nFLTeam.upsert({
      where: { abbreviation: team.abbreviation },
      update: {},
      create: team,
    });
    teamIdByAbbreviation.set(team.abbreviation, row.id);
  }
  console.log(`Upserted ${NFL_TEAMS.length} NFL teams.`);

  // --- Generate veteran rosters + free agents + rookie class ---------------
  const generatedVeterans: GeneratedPlayer[] = [];
  for (const team of NFL_TEAMS) {
    generatedVeterans.push(...generateVeteranRoster(rand, team));
  }
  const generatedFreeAgents = generateFreeAgents(rand, 16);
  const rookies = generateRookieClass(rand, NFL_TEAMS.map((t) => t.abbreviation));

  console.log(
    `Generated ${generatedVeterans.length} veteran players, ${generatedFreeAgents.length} free agents, ${rookies.length} rookies.`
  );

  // --- Insert Player rows (sequential to capture generated ids in order) ---
  const derivedInputs: DerivedPlayerInput[] = [];
  const playerStatByOrder: { generated: GeneratedPlayer; stat: StatLine; id: string }[] = [];

  async function insertPlayer(generated: GeneratedPlayer, stat: StatLine) {
    const nflTeamId = generated.teamAbbreviation ? teamIdByAbbreviation.get(generated.teamAbbreviation) ?? null : null;
    const player = await prisma.player.create({
      data: {
        firstName: generated.firstName,
        lastName: generated.lastName,
        position: generated.position,
        nflTeamId,
        jerseyNumber: generated.jerseyNumber,
        college: generated.college,
        age: generated.age,
        heightInches: generated.heightInches,
        weightLbs: generated.weightLbs,
        yearsExperience: generated.yearsExperience,
        isRookie: generated.isRookie,
        isFreeAgent: generated.isFreeAgent,
        returningFromInjury: generated.returningFromInjury,
        injuryStatus: generated.injuryStatus,
        dataSource: "SEED",
      },
    });
    playerStatByOrder.push({ generated, stat, id: player.id });
    derivedInputs.push({ id: player.id, position: generated.position, stat });
    return player.id;
  }

  for (const generated of generatedVeterans) {
    const stat = generateStatLine(rand, generated.position, generated.quality);
    await insertPlayer(generated, stat);
  }
  for (const generated of generatedFreeAgents) {
    const stat = generateStatLine(rand, generated.position, generated.quality);
    await insertPlayer(generated, stat);
  }
  const rookiePlayerIds = new Map<number, string>();
  for (let i = 0; i < rookies.length; i++) {
    const r = rookies[i]!;
    const id = await insertPlayer(r.player, r.stat);
    rookiePlayerIds.set(i, id);
  }
  console.log(`Inserted ${playerStatByOrder.length} players.`);

  // --- PlayerSeason rows -----------------------------------------------------
  await prisma.playerSeason.createMany({
    data: playerStatByOrder.map(({ generated, id }) => ({
      playerId: id,
      seasonId: season.id,
      byeWeek: generated.teamAbbreviation ? seedByeWeek(generated.teamAbbreviation) : null,
      dataSource: "SEED" as const,
    })),
  });

  // --- RookieProfile rows -----------------------------------------------------
  await prisma.rookieProfile.createMany({
    data: rookies.map((r, i) => ({
      playerId: rookiePlayerIds.get(i)!,
      draftYear: SEASON_YEAR,
      draftRound: r.draftRound,
      draftPick: r.draftPick,
      rookieTier: r.rookieTier,
      fantasyPositionRank: r.fantasyPositionRank,
      overallFantasyRank: r.overallFantasyRank,
      projectedGames: r.projectedGames,
      projectedAttempts: r.projectedAttempts,
      projectedReceptions: r.projectedReceptions,
      projectedTargets: r.projectedTargets,
      projectedRushingYards: r.projectedRushingYards,
      projectedReceivingYards: r.projectedReceivingYards,
      projectedTouchdowns: r.projectedTouchdowns,
      projectedFantasyPoints: r.projectedFantasyPoints,
      floor: r.floor,
      median: r.median,
      ceiling: r.ceiling,
      opportunityScore: r.opportunityScore,
      competitionScore: r.competitionScore,
      landingSpotScore: r.landingSpotScore,
      breakoutScore: r.breakoutScore,
      analystNotes: r.analystNotes,
    })),
  });
  console.log(`Inserted ${rookies.length} rookie profiles.`);

  // --- Derive rankings / projections / ADP / tiers ----------------------------
  const derived = deriveSeedData(rand, derivedInputs);

  const tierRows = await prisma.tier.createManyAndReturn({
    data: derived.tierKeys.map((k) => ({
      seasonId: season.id,
      position: k.position,
      scoringFormat: k.scoringFormat,
      tierNumber: k.tierNumber,
      label: `${k.position} Tier ${k.tierNumber} - ${tierLabel(k.tierNumber)}`,
    })),
  });
  const tierIdByKey = new Map<string, string>();
  for (const row of tierRows) {
    tierIdByKey.set(`${row.position}|${row.scoringFormat}|${row.tierNumber}`, row.id);
  }

  await prisma.ranking.createMany({
    data: derived.rankings.map((r) => ({
      seasonId: season.id,
      playerId: r.playerId,
      source: r.source,
      scoringFormat: r.scoringFormat,
      overallRank: r.overallRank,
      positionRank: r.positionRank,
    })),
  });

  await prisma.projection.createMany({
    data: derived.projections.map((p) => ({
      seasonId: season.id,
      playerId: p.playerId,
      scoringFormat: p.scoringFormat,
      games: p.stat.games,
      attempts: p.stat.attempts,
      completions: p.stat.completions,
      passingYards: p.stat.passingYards,
      passingTDs: p.stat.passingTDs,
      interceptions: p.stat.interceptions,
      rushAttempts: p.stat.rushAttempts,
      rushingYards: p.stat.rushingYards,
      rushingTDs: p.stat.rushingTDs,
      targets: p.stat.targets,
      receptions: p.stat.receptions,
      receivingYards: p.stat.receivingYards,
      receivingTDs: p.stat.receivingTDs,
      fieldGoalsMade: p.stat.fieldGoalsMade,
      extraPointsMade: p.stat.extraPointsMade,
      sacks: p.stat.sacks,
      defensiveInterceptions: p.stat.defensiveInterceptions,
      fumbleRecoveries: p.stat.fumbleRecoveries,
      defensiveTDs: p.stat.defensiveTDs,
      safeties: p.stat.safeties,
      pointsAllowedPerGame: p.stat.pointsAllowedPerGame,
      fantasyPoints: p.fantasyPoints,
      floor: p.floor,
      median: p.median,
      ceiling: p.ceiling,
    })),
  });

  await prisma.aDP.createMany({
    data: derived.adps.map((a) => ({
      seasonId: season.id,
      playerId: a.playerId,
      scoringFormat: a.scoringFormat,
      overallADP: a.overallADP,
      positionADP: a.positionADP,
      previousADP: a.previousADP,
      adpDelta: a.adpDelta,
      sampleSize: 250,
    })),
  });

  // Update PlayerSeason.tierId using the PPR-format tier as the default display tier.
  const pprAssignmentByPlayer = new Map<string, string>();
  for (const a of derived.tierAssignments) {
    if (a.scoringFormat !== "PPR") continue;
    const tierId = tierIdByKey.get(`${a.tierKey.position}|${a.tierKey.scoringFormat}|${a.tierKey.tierNumber}`);
    if (tierId) pprAssignmentByPlayer.set(a.playerId, tierId);
  }
  for (const [playerId, tierId] of pprAssignmentByPlayer) {
    await prisma.playerSeason.updateMany({
      where: { playerId, seasonId: season.id },
      data: { tierId },
    });
  }

  console.log(
    `Inserted ${derived.rankings.length} rankings, ${derived.projections.length} projections, ${derived.adps.length} ADP rows, ${tierRows.length} tiers.`
  );

  // --- Demo user + default league -------------------------------------------
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@draftiq.app" },
    update: {},
    create: { email: "demo@draftiq.app", displayName: "Demo Manager", authProvider: "demo" },
  });

  const existingLeague = await prisma.league.findFirst({ where: { userId: demoUser.id } });
  const league =
    existingLeague ??
    (await prisma.league.create({
      data: {
        userId: demoUser.id,
        name: "The Demo League",
        teamCount: 12,
        scoringFormatPreset: "PPR",
        settings: {
          create: {},
        },
      },
    }));

  console.log(`Demo user: ${demoUser.email} / League: ${league.name}`);
  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
