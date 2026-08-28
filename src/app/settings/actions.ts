"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createLeague, deleteLeague, updateLeague, updateLeagueMflConfig, updateLeagueSettings } from "@/lib/queries/leagues";
import { createLeagueSchema, leagueSettingsSchema, mflConfigSchema } from "@/lib/validation/league";
import type { ScoringFormatPreset } from "@prisma/client";

export async function createLeagueAction(formData: FormData) {
  const user = await requireUser();
  const input = createLeagueSchema.parse({
    name: String(formData.get("name") ?? ""),
    teamCount: Number(formData.get("teamCount")),
    scoringFormatPreset: String(formData.get("scoringFormatPreset")) as ScoringFormatPreset,
  });
  await createLeague(user.id, input);
  revalidatePath("/settings");
}

export async function updateLeagueAction(leagueId: string, formData: FormData) {
  await requireUser();
  await updateLeague(leagueId, {
    name: String(formData.get("name") ?? ""),
    teamCount: Number(formData.get("teamCount")),
    scoringFormatPreset: String(formData.get("scoringFormatPreset")) as ScoringFormatPreset,
  });
  revalidatePath("/settings");
}

export async function updateLeagueSettingsAction(leagueId: string, formData: FormData) {
  await requireUser();
  const raw = Object.fromEntries(formData.entries());
  const input = leagueSettingsSchema.partial().parse({
    passingTDPoints: Number(raw.passingTDPoints),
    passingYardPoints: Number(raw.passingYardPoints),
    interceptionPoints: Number(raw.interceptionPoints),
    rushingTDPoints: Number(raw.rushingTDPoints),
    rushingYardPoints: Number(raw.rushingYardPoints),
    receivingTDPoints: Number(raw.receivingTDPoints),
    receivingYardPoints: Number(raw.receivingYardPoints),
    receptionPoints: Number(raw.receptionPoints),
    tePremiumBonus: Number(raw.tePremiumBonus),
    benchSize: Number(raw.benchSize),
    qbSlots: Number(raw.qbSlots),
    rbSlots: Number(raw.rbSlots),
    wrSlots: Number(raw.wrSlots),
    teSlots: Number(raw.teSlots),
    flexSlots: Number(raw.flexSlots),
    superflexSlots: Number(raw.superflexSlots),
    kSlot: raw.kSlot === "on",
    dstSlot: raw.dstSlot === "on",
  });
  await updateLeagueSettings(leagueId, input);
  revalidatePath("/settings");
}

export async function updateMflConfigAction(leagueId: string, formData: FormData) {
  await requireUser();
  const input = mflConfigSchema.parse({
    mflLeagueId: String(formData.get("mflLeagueId") ?? ""),
    mflHost: String(formData.get("mflHost") ?? ""),
  });
  await updateLeagueMflConfig(leagueId, input);
  revalidatePath("/settings");
}

export async function deleteLeagueAction(leagueId: string) {
  const user = await requireUser();
  await deleteLeague(user.id, leagueId);
  revalidatePath("/settings");
}
