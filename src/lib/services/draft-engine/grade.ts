import type { Position } from "@prisma/client";
import type { SimulatedPick } from "./simulate";

export interface GradedPlayerInfo {
  playerId: string;
  position: Position;
  name: string;
}

export interface GradeDraftInput {
  userPicks: SimulatedPick[];
  playerInfo: Map<string, GradedPlayerInfo>;
  leagueSettings: { qbSlots: number; rbSlots: number; wrSlots: number; teSlots: number; flexSlots: number; superflexSlots: number };
}

export interface PickNote {
  playerId: string;
  name: string;
  round: number;
  valueDelta: number;
  note: string;
}

export interface DraftGradeResult {
  overallGrade: string;
  gradeScore: number;
  positionalGrades: Partial<Record<Position, string>>;
  valueGained: number;
  reachPenalty: number;
  bestPicks: PickNote[];
  worstPicks: PickNote[];
  strengths: string[];
  weaknesses: string[];
  recommendedImprovements: string[];
}

function letterGrade(score: number): string {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 65) return "D";
  return "F";
}

export function gradeDraft(input: GradeDraftInput): DraftGradeResult {
  const deltas = input.userPicks.map((pick) => {
    const info = input.playerInfo.get(pick.playerId);
    // Positive delta: ADP later than the pick spent (i.e. got value). Negative: reached.
    const valueDelta = Math.round((pick.adpAtPick - pick.overallPick) * 10) / 10;
    return { pick, info, valueDelta };
  });

  const valueGained = Math.round(deltas.filter((d) => d.valueDelta > 0).reduce((sum, d) => sum + d.valueDelta, 0) * 10) / 10;
  const reachPenalty = Math.round(Math.abs(deltas.filter((d) => d.valueDelta < 0).reduce((sum, d) => sum + d.valueDelta, 0)) * 10) / 10;

  const positionTotals = new Map<Position, { count: number; delta: number }>();
  for (const d of deltas) {
    if (!d.info) continue;
    const cur = positionTotals.get(d.info.position) ?? { count: 0, delta: 0 };
    cur.count += 1;
    cur.delta += d.valueDelta;
    positionTotals.set(d.info.position, cur);
  }

  const positionalGrades: Partial<Record<Position, string>> = {};
  for (const [position, { count, delta }] of positionTotals) {
    const avgDelta = delta / count;
    positionalGrades[position] = letterGrade(70 + avgDelta * 2.2);
  }

  const gradeScore = Math.min(100, Math.max(0, Math.round((70 + valueGained * 0.9 - reachPenalty * 1.1) * 10) / 10));
  const overallGrade = letterGrade(gradeScore);

  const sorted = [...deltas].sort((a, b) => b.valueDelta - a.valueDelta);
  const toNote = (d: (typeof deltas)[number], positive: boolean): PickNote => ({
    playerId: d.pick.playerId,
    name: d.info?.name ?? "Unknown player",
    round: d.pick.round,
    valueDelta: d.valueDelta,
    note: positive
      ? `Fell to round ${d.pick.round} despite an ADP of pick ${Math.round(d.pick.adpAtPick)} -- excellent value.`
      : `Taken in round ${d.pick.round}, well ahead of an ADP of pick ${Math.round(d.pick.adpAtPick)} -- a reach.`,
  });

  const bestPicks = sorted.slice(0, 3).filter((d) => d.valueDelta > 0).map((d) => toNote(d, true));
  const worstPicks = sorted
    .slice(-3)
    .reverse()
    .filter((d) => d.valueDelta < 0)
    .map((d) => toNote(d, false));

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendedImprovements: string[] = [];

  const rbCount = positionTotals.get("RB")?.count ?? 0;
  const wrCount = positionTotals.get("WR")?.count ?? 0;
  const teCount = positionTotals.get("TE")?.count ?? 0;
  const qbCount = positionTotals.get("QB")?.count ?? 0;

  if (rbCount >= input.leagueSettings.rbSlots + 2) strengths.push("Strong RB depth to weather bye weeks and injuries.");
  else if (rbCount < input.leagueSettings.rbSlots) {
    weaknesses.push("Thin at RB relative to your starting requirements.");
    recommendedImprovements.push("Prioritize RB depth on the waiver wire or in future drafts.");
  }

  if (wrCount >= input.leagueSettings.wrSlots + 2) strengths.push("Deep WR corps with weekly flex flexibility.");
  else if (wrCount < input.leagueSettings.wrSlots) {
    weaknesses.push("Thin at WR relative to your starting requirements.");
    recommendedImprovements.push("Prioritize WR depth on the waiver wire or in future drafts.");
  }

  if (teCount === 0) {
    weaknesses.push("No tight end rostered.");
    recommendedImprovements.push("Stream or trade for a startable TE.");
  } else if (teCount >= 2) {
    strengths.push("Rostered TE depth, a safety net against bye weeks/injury.");
  }

  if (qbCount === 0) {
    weaknesses.push("No quarterback rostered.");
    recommendedImprovements.push("Add a startable QB immediately.");
  }

  if (valueGained > reachPenalty * 1.5) strengths.push("Consistently found value relative to ADP throughout the draft.");
  if (reachPenalty > valueGained * 1.5) {
    weaknesses.push("Multiple picks reached well ahead of ADP.");
    recommendedImprovements.push("Lean more on ADP/value rankings in the middle rounds instead of need alone.");
  }

  if (strengths.length === 0) strengths.push("Balanced roster construction with no glaring hole.");
  if (recommendedImprovements.length === 0) recommendedImprovements.push("Solid draft -- monitor the waiver wire for late-round upgrades.");

  return {
    overallGrade,
    gradeScore,
    positionalGrades,
    valueGained,
    reachPenalty,
    bestPicks,
    worstPicks,
    strengths,
    weaknesses,
    recommendedImprovements,
  };
}
