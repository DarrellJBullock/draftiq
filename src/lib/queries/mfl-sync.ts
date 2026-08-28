import type { Position } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getOverallPick, getRoundAndPickInRound } from "@/lib/services/draft-engine/pick-order";
import { fetchMflConferences, fetchMflDraftUnits, fetchMflPlayerIndex, parseFranchiseOrder } from "@/lib/services/providers/mfl-provider";

// MFL includes name suffixes ("Brian Thomas Jr.") that our own Player table
// usually omits -- normalize both sides the same way before comparing.
function normalizeNamePart(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.'']/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface MflUnmatchedPick {
  round: number;
  pickInRound: number;
  teamSlot: number;
  mflFirstName: string;
  mflLastName: string;
  mflPosition: Position | null;
}

export interface MflSyncResult {
  syncedCount: number;
  unmatched: MflUnmatchedPick[];
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Pulls current picks for one conference's live MFL draft and merges any new ones into this Draft. */
export async function syncDraftFromMfl(draftId: string): Promise<MflSyncResult> {
  const draft = await prisma.draft.findUnique({ where: { id: draftId }, include: { league: true, season: true } });
  if (!draft) throw new Error("Draft not found");
  if (!draft.league.mflLeagueId || !draft.league.mflHost) {
    throw new Error("MyFantasyLeague sync isn't set up for this league yet -- add your league ID and host in Settings.");
  }

  const { mflLeagueId, mflHost } = draft.league;
  const seasonYear = draft.season.year;

  const [conferences, units] = await Promise.all([
    fetchMflConferences(mflHost, mflLeagueId, seasonYear),
    fetchMflDraftUnits(mflHost, mflLeagueId, seasonYear),
  ]);

  let unit;
  if (draft.conference) {
    const match = conferences.find((c) => c.name.toLowerCase() === draft.conference!.toLowerCase());
    if (!match) throw new Error(`MyFantasyLeague has no conference named "${draft.conference}" in this league.`);
    unit = units.find((u) => u.unit === `CONFERENCE${match.id}`);
    if (!unit) throw new Error(`Couldn't find an MFL draft for conference "${draft.conference}".`);
  } else {
    if (units.length !== 1) throw new Error("This league has multiple MFL drafts -- set a conference on this draft to pick which one to sync.");
    unit = units[0];
  }

  const franchiseOrder = parseFranchiseOrder(unit.round1DraftOrder);
  if (franchiseOrder.length === 0) {
    throw new Error("MyFantasyLeague hasn't set the draft order for this conference yet.");
  }
  if (franchiseOrder.length !== draft.teamCount) {
    throw new Error(
      `MyFantasyLeague's draft has ${franchiseOrder.length} teams but this draft is set up for ${draft.teamCount} -- fix the team count before syncing.`
    );
  }
  const franchiseToTeamSlot = new Map(franchiseOrder.map((franchiseId, i) => [franchiseId, i + 1]));

  const mflPicks = asArray(unit.draftPick);
  if (mflPicks.length === 0) {
    return { syncedCount: 0, unmatched: [] };
  }

  const existingPicks = await prisma.draftPick.findMany({ where: { draftId: draft.id }, select: { overallPick: true, playerId: true } });
  const existingByOverallPick = new Map(existingPicks.map((p) => [p.overallPick, p.playerId]));

  const candidates = mflPicks
    .map((p) => {
      const round = Number(p.round);
      const pickInRound = Number(p.pick);
      const overallPick = getOverallPick(draft.teamCount, round, pickInRound);
      const teamSlot = franchiseToTeamSlot.get(p.franchise);
      return { round, pickInRound, overallPick, teamSlot, mflPlayerId: p.player, timestamp: p.timestamp };
    })
    .filter((c) => c.teamSlot !== undefined);

  // A pick already recorded locally (from an earlier sync or a manual entry)
  // needs no further action -- only resolve the ones MFL knows about that we don't yet.
  const toResolve = candidates.filter((c) => !existingByOverallPick.has(c.overallPick));

  const playerIndex = await fetchMflPlayerIndex(
    seasonYear,
    toResolve.map((c) => c.mflPlayerId)
  );

  const candidatesByPosition = new Map<Position, { id: string; firstName: string; lastName: string }[]>();
  async function findMatchingPlayer(firstName: string, lastName: string, position: Position) {
    let pool = candidatesByPosition.get(position);
    if (!pool) {
      pool = await prisma.player.findMany({ where: { position }, select: { id: true, firstName: true, lastName: true } });
      candidatesByPosition.set(position, pool);
    }
    const targetFirst = normalizeNamePart(firstName);
    const targetLast = normalizeNamePart(lastName);
    const matches = pool.filter((p) => normalizeNamePart(p.firstName) === targetFirst && normalizeNamePart(p.lastName) === targetLast);
    return matches.length === 1 ? matches[0] : null;
  }

  const alreadyDraftedPlayerIds = new Set(existingPicks.map((p) => p.playerId).filter((id): id is string => !!id));
  const unmatched: MflUnmatchedPick[] = [];
  const toInsert: { round: number; pickInRound: number; overallPick: number; teamSlot: number; playerId: string; pickedAt: Date }[] = [];

  for (const c of toResolve) {
    const info = playerIndex.get(c.mflPlayerId);
    const matchedPlayer = info && info.position ? await findMatchingPlayer(info.firstName, info.lastName, info.position) : null;

    if (matchedPlayer && !alreadyDraftedPlayerIds.has(matchedPlayer.id)) {
      alreadyDraftedPlayerIds.add(matchedPlayer.id);
      toInsert.push({
        round: c.round,
        pickInRound: c.pickInRound,
        overallPick: c.overallPick,
        teamSlot: c.teamSlot!,
        playerId: matchedPlayer.id,
        pickedAt: new Date(Number(c.timestamp) * 1000),
      });
    } else {
      unmatched.push({
        round: c.round,
        pickInRound: c.pickInRound,
        teamSlot: c.teamSlot!,
        mflFirstName: info?.firstName ?? "Unknown",
        mflLastName: info?.lastName ?? c.mflPlayerId,
        mflPosition: info?.position ?? null,
      });
    }
  }

  if (toInsert.length > 0) {
    await prisma.draftPick.createMany({
      data: toInsert.map((p) => ({
        draftId: draft.id,
        round: p.round,
        pickInRound: p.pickInRound,
        overallPick: p.overallPick,
        teamSlot: p.teamSlot,
        playerId: p.playerId,
        isUserPick: p.teamSlot === draft.userDraftPosition,
        pickedAt: p.pickedAt,
      })),
    });

    const maxOverallPick = Math.max(...toInsert.map((p) => p.overallPick));
    const nextPick = Math.max(draft.currentPick, maxOverallPick + 1);
    if (nextPick > draft.currentPick) {
      const completed = nextPick > draft.teamCount * draft.rounds;
      const { round: nextRound } = getRoundAndPickInRound(draft.teamCount, completed ? maxOverallPick : nextPick);
      await prisma.draft.update({
        where: { id: draft.id },
        data: { currentPick: completed ? draft.currentPick : nextPick, currentRound: nextRound, status: completed ? "COMPLETED" : "IN_PROGRESS" },
      });
    }
  }

  return { syncedCount: toInsert.length, unmatched };
}

export async function resolveMflPick(draftId: string, input: { round: number; pickInRound: number; teamSlot: number; playerId: string }) {
  const draft = await prisma.draft.findUnique({ where: { id: draftId } });
  if (!draft) throw new Error("Draft not found");

  const overallPick = getOverallPick(draft.teamCount, input.round, input.pickInRound);
  const alreadyPicked = await prisma.draftPick.findFirst({ where: { draftId: draft.id, playerId: input.playerId } });
  if (alreadyPicked) throw new Error("That player has already been drafted in this draft");

  await prisma.draftPick.create({
    data: {
      draftId: draft.id,
      round: input.round,
      pickInRound: input.pickInRound,
      overallPick,
      teamSlot: input.teamSlot,
      playerId: input.playerId,
      isUserPick: input.teamSlot === draft.userDraftPosition,
      pickedAt: new Date(),
    },
  });

  const nextPick = Math.max(draft.currentPick, overallPick + 1);
  if (nextPick > draft.currentPick) {
    const completed = nextPick > draft.teamCount * draft.rounds;
    const { round: nextRound } = getRoundAndPickInRound(draft.teamCount, completed ? overallPick : nextPick);
    await prisma.draft.update({
      where: { id: draft.id },
      data: { currentPick: completed ? draft.currentPick : nextPick, currentRound: nextRound, status: completed ? "COMPLETED" : "IN_PROGRESS" },
    });
  }

  return { ok: true };
}
