"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { addPlayerToRoster, getOrCreateManualRoster, removePlayerFromRoster } from "@/lib/queries/roster";

/** Resolves the current user's manual (non-draft) roster for their default league, creating either as needed. */
async function resolveManualRoster() {
  const user = await requireUser();
  const league = await getOrCreateDefaultLeague(user.id);
  const roster = await getOrCreateManualRoster(user.id, league.id);
  return roster;
}

export async function addPlayerAction(playerId: string, slot: string) {
  const roster = await resolveManualRoster();
  await addPlayerToRoster(roster.id, playerId, slot);
  revalidatePath("/team-builder");
}

export async function removePlayerAction(playerId: string) {
  const roster = await resolveManualRoster();
  await removePlayerFromRoster(roster.id, playerId);
  revalidatePath("/team-builder");
}

/** Moves an already-rostered player to a different slot (e.g. bench -> starter). */
export async function movePlayerAction(playerId: string, slot: string) {
  const roster = await resolveManualRoster();
  await addPlayerToRoster(roster.id, playerId, slot);
  revalidatePath("/team-builder");
}
