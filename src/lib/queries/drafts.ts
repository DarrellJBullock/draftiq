import type { CPUPersonality, ScoringFormatPreset } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getValuedPlayerPool } from "./value-pool";
import { getOrCreateDefaultLeague } from "./leagues";
import { resolveSeason } from "./resolve-season";
import {
  simulateFullDraft,
  gradeDraft,
  getRoundAndPickInRound,
  getTeamSlotForPick,
  type DraftPoolPlayer,
  type RosterSlotsNeeded,
} from "@/lib/services/draft-engine";
import type { AddKeeperInput, DraftPickInput, SimulateDraftInput } from "@/lib/validation/draft";

const ALL_PERSONALITIES: CPUPersonality[] = [
  "BPA",
  "ZERO_RB",
  "HERO_RB",
  "ZERO_WR",
  "EARLY_QB",
  "LATE_QB",
  "ELITE_TE",
  "ROOKIE_HEAVY",
  "ADP_FOCUSED",
  "SLEEPER_FOCUSED",
];

export async function runAndPersistMockDraft(userId: string, input: SimulateDraftInput) {
  const season = await prisma.season.findFirst({ where: { year: input.season } });
  if (!season) throw new Error(`No season found for year ${input.season}`);

  const league =
    (input.leagueId && (await prisma.league.findUnique({ where: { id: input.leagueId }, include: { settings: true } }))) ||
    (await prisma.league.findFirst({ where: { userId }, include: { settings: true } }));

  const leagueSettings: RosterSlotsNeeded = league?.settings ?? {
    qbSlots: 1,
    rbSlots: 2,
    wrSlots: 2,
    teSlots: 1,
    flexSlots: 1,
    superflexSlots: 0,
    kSlot: true,
    dstSlot: true,
    benchSize: 6,
  };

  const keeperPlayerIds = new Set(input.keepers.map((k) => k.playerId));
  const pool = await getValuedPlayerPool(season.id, input.scoringFormat);
  const draftPool: DraftPoolPlayer[] = pool
    .filter((p) => !keeperPlayerIds.has(p.id))
    .map((p) => ({
      id: p.id,
      position: p.position,
      overallRank: p.ranking?.overallRank ?? 999,
      adp: p.adp?.overallADP ?? 999,
      projectedPoints: p.projection?.fantasyPoints ?? 0,
      isRookie: p.isRookie,
    }));

  const cpuPersonalities =
    input.cpuPersonalities && input.cpuPersonalities.length > 0
      ? input.cpuPersonalities
      : Array.from({ length: input.teamCount - 1 }, (_, i) => ALL_PERSONALITIES[i % ALL_PERSONALITIES.length]!);

  const picks = simulateFullDraft({
    teamCount: input.teamCount,
    rounds: input.rounds,
    draftPosition: input.draftPosition,
    mode: input.mode,
    cpuPersonalities,
    userStrategy: input.userStrategy,
    pool: draftPool,
    leagueSettings,
    rand: Math.random,
  });

  const draft = await prisma.draft.create({
    data: {
      leagueId: league!.id,
      seasonId: season.id,
      mode: input.mode,
      type: "SIMULATOR",
      status: "COMPLETED",
      conference: input.conference,
      teamCount: input.teamCount,
      rounds: input.rounds,
      userDraftPosition: input.draftPosition,
      cpuPersonalities: cpuPersonalities as unknown as object,
      currentRound: input.rounds,
      currentPick: input.teamCount * input.rounds,
    },
  });

  await prisma.draftPick.createMany({
    data: picks.map((p) => ({
      draftId: draft.id,
      round: p.round,
      pickInRound: p.pickInRound,
      overallPick: p.overallPick,
      teamSlot: p.teamSlot,
      playerId: p.playerId,
      isUserPick: p.isUserPick,
      valueAtPick: p.valueAtPick,
      adpAtPick: p.adpAtPick,
      reachAmount: Math.max(0, p.overallPick - p.adpAtPick),
      pickedAt: new Date(),
    })),
  });

  if (input.keepers.length > 0) {
    await prisma.draftPick.createMany({
      data: input.keepers.map((k, i) => ({
        draftId: draft.id,
        round: 0,
        pickInRound: 0,
        overallPick: -(i + 1), // negative sentinel, distinct from real picks (always >= 1)
        teamSlot: k.teamSlot,
        playerId: k.playerId,
        isUserPick: k.teamSlot === input.draftPosition,
        isKeeper: true,
        pickedAt: new Date(),
      })),
    });
  }

  const playerInfo = new Map(pool.map((p) => [p.id, { playerId: p.id, position: p.position, name: `${p.firstName} ${p.lastName}` }]));
  const userPicks = picks.filter((p) => p.isUserPick);
  const grading = gradeDraft({ userPicks, playerInfo, leagueSettings });

  const mockDraft = await prisma.mockDraft.create({
    data: {
      userId,
      draftId: draft.id,
      conference: input.conference,
      leagueSettingsSnapshot: leagueSettings as unknown as object,
      draftPosition: input.draftPosition,
      teamCount: input.teamCount,
      rounds: input.rounds,
      scoringFormat: input.scoringFormat as ScoringFormatPreset,
      strategyUsed: input.userStrategy,
      overallGrade: grading.overallGrade,
      gradeScore: grading.gradeScore,
      positionalGrades: grading.positionalGrades as unknown as object,
      valueGained: grading.valueGained,
      reachPenalty: grading.reachPenalty,
      bestPicks: grading.bestPicks as unknown as object,
      worstPicks: grading.worstPicks as unknown as object,
      strengths: grading.strengths,
      weaknesses: grading.weaknesses,
      recommendedImprovements: grading.recommendedImprovements,
    },
  });

  return { draftId: draft.id, mockDraftId: mockDraft.id };
}

export async function getMockDraftResult(mockDraftId: string) {
  const mockDraft = await prisma.mockDraft.findUnique({
    where: { id: mockDraftId },
    include: {
      draft: {
        include: {
          picks: {
            include: { player: { include: { nflTeam: true } } },
            orderBy: { overallPick: "asc" },
          },
        },
      },
    },
  });
  return mockDraft;
}

export async function getUserMockDrafts(userId: string) {
  return prisma.mockDraft.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
}

/**
 * Finds (or starts) the user's in-progress live Draft Day session, scoped to
 * a specific league and (for a league split into independently-drafted
 * groups) a specific conference -- so "NFC" and "AFC" can each have their
 * own live draft in progress under the same league at the same time.
 */
export async function getOrCreateLiveDraft(userId: string, setup: Partial<DraftPickInput> = {}) {
  const league = setup.leagueId ? await prisma.league.findUnique({ where: { id: setup.leagueId } }) : await getOrCreateDefaultLeague(userId);
  if (!league) throw new Error("League not found");

  const existing = await prisma.draft.findFirst({
    where: { type: "LIVE", status: "IN_PROGRESS", leagueId: league.id, conference: setup.conference ?? null },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  const season = await resolveSeason(setup.season);

  return prisma.draft.create({
    data: {
      leagueId: league.id,
      seasonId: season.id,
      mode: setup.mode ?? "SNAKE",
      type: "LIVE",
      status: "IN_PROGRESS",
      conference: setup.conference,
      teamCount: setup.teamCount ?? league.teamCount,
      rounds: setup.rounds ?? 16,
      userDraftPosition: setup.draftPosition ?? 1,
      currentRound: 1,
      currentPick: 1,
    },
  });
}

/** Distinct conference labels already used for a league's drafts, for building a quick-select UI. */
export async function getLeagueConferences(leagueId: string): Promise<string[]> {
  const rows = await prisma.draft.findMany({
    where: { leagueId, conference: { not: null } },
    select: { conference: true },
    distinct: ["conference"],
    orderBy: { conference: "asc" },
  });
  return rows.map((r) => r.conference!).filter(Boolean);
}

export async function getDraftById(draftId: string) {
  return prisma.draft.findUnique({
    where: { id: draftId },
    include: { picks: { include: { player: { include: { nflTeam: true } } }, orderBy: { overallPick: "asc" } } },
  });
}

/** Records one manually-entered pick in a live Draft Day session, creating the draft on the first call. */
export async function submitDraftPick(userId: string, input: DraftPickInput) {
  const draft = input.draftId ? await prisma.draft.findUnique({ where: { id: input.draftId } }) : await getOrCreateLiveDraft(userId, input);
  if (!draft) throw new Error("Draft not found");
  if (draft.status === "COMPLETED") throw new Error("This draft has already finished");

  const teamSlot = input.teamSlot ?? getTeamSlotForPick(draft.teamCount, draft.mode, draft.currentPick);
  const { round, pickInRound } = getRoundAndPickInRound(draft.teamCount, draft.currentPick);

  const alreadyPicked = await prisma.draftPick.findFirst({ where: { draftId: draft.id, playerId: input.playerId } });
  if (alreadyPicked) throw new Error("That player has already been drafted");

  const adpRow = await prisma.aDP.findFirst({ where: { seasonId: draft.seasonId, playerId: input.playerId, scoringFormat: "PPR" } });

  await prisma.draftPick.create({
    data: {
      draftId: draft.id,
      round,
      pickInRound,
      overallPick: draft.currentPick,
      teamSlot,
      playerId: input.playerId,
      isUserPick: teamSlot === draft.userDraftPosition,
      adpAtPick: adpRow?.overallADP,
      reachAmount: adpRow ? Math.max(0, draft.currentPick - adpRow.overallADP) : null,
      pickedAt: new Date(),
    },
  });

  const nextPick = draft.currentPick + 1;
  const completed = nextPick > draft.teamCount * draft.rounds;
  const nextRound = getRoundAndPickInRound(draft.teamCount, completed ? draft.currentPick : nextPick).round;

  const updated = await prisma.draft.update({
    where: { id: draft.id },
    data: {
      currentPick: completed ? draft.currentPick : nextPick,
      currentRound: nextRound,
      status: completed ? "COMPLETED" : "IN_PROGRESS",
    },
  });

  return { draft: updated, completed };
}

/**
 * Records a player pre-assigned to a team from a prior season (a keeper).
 * Unlike `submitDraftPick`, this does not consume a normal turn -- it
 * doesn't advance currentPick/currentRound, it just takes the player off
 * the board for the rest of the draft.
 */
export async function addKeeper(userId: string, input: AddKeeperInput) {
  const draft = input.draftId ? await prisma.draft.findUnique({ where: { id: input.draftId } }) : await getOrCreateLiveDraft(userId, input);
  if (!draft) throw new Error("Draft not found");
  if (draft.status === "COMPLETED") throw new Error("This draft has already finished");

  const alreadyTaken = await prisma.draftPick.findFirst({ where: { draftId: draft.id, playerId: input.playerId } });
  if (alreadyTaken) throw new Error("That player is already drafted or kept in this draft");

  const existingKeeperCount = await prisma.draftPick.count({ where: { draftId: draft.id, isKeeper: true } });

  return prisma.draftPick.create({
    data: {
      draftId: draft.id,
      round: 0,
      pickInRound: 0,
      overallPick: -(existingKeeperCount + 1), // negative sentinel, distinct from real picks (always >= 1)
      teamSlot: input.teamSlot,
      playerId: input.playerId,
      isUserPick: input.teamSlot === draft.userDraftPosition,
      isKeeper: true,
      pickedAt: new Date(),
    },
  });
}
