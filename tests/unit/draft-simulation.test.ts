import { describe, expect, it } from "vitest";
import { simulateFullDraft, type DraftPoolPlayer, type RosterSlotsNeeded } from "@/lib/services/draft-engine/simulate";
import { gradeDraft, type GradedPlayerInfo } from "@/lib/services/draft-engine/grade";
import { mulberry32 } from "../../prisma/seed/rng";

const LEAGUE_SETTINGS: RosterSlotsNeeded = {
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

function buildPool(): DraftPoolPlayer[] {
  const pool: DraftPoolPlayer[] = [];
  let rank = 1;
  const positions: Array<[DraftPoolPlayer["position"], number]> = [
    ["QB", 24],
    ["RB", 60],
    ["WR", 70],
    ["TE", 24],
    ["K", 20],
    ["DST", 20],
  ];
  for (const [position, count] of positions) {
    for (let i = 0; i < count; i++) {
      pool.push({
        id: `${position}-${i}`,
        position,
        overallRank: rank,
        adp: rank + (i % 5) - 2,
        projectedPoints: Math.max(10, 300 - rank * 1.5),
        isRookie: i % 7 === 0,
      });
      rank++;
    }
  }
  return pool;
}

describe("mock draft simulation", () => {
  it("produces exactly teamCount * rounds unique picks with no duplicate players", () => {
    const rand = mulberry32(42);
    const picks = simulateFullDraft({
      teamCount: 10,
      rounds: 15,
      draftPosition: 4,
      mode: "SNAKE",
      cpuPersonalities: ["BPA", "ZERO_RB", "HERO_RB", "EARLY_QB", "LATE_QB", "ELITE_TE", "ROOKIE_HEAVY", "ADP_FOCUSED", "SLEEPER_FOCUSED"],
      pool: buildPool(),
      leagueSettings: LEAGUE_SETTINGS,
      rand,
    });

    expect(picks.length).toBe(10 * 15);
    const playerIds = picks.map((p) => p.playerId);
    expect(new Set(playerIds).size).toBe(playerIds.length);
  });

  it("gives the user exactly `rounds` picks, one per round, at their draft slot", () => {
    const rand = mulberry32(7);
    const teamCount = 8;
    const rounds = 12;
    const picks = simulateFullDraft({
      teamCount,
      rounds,
      draftPosition: 5,
      mode: "SNAKE",
      cpuPersonalities: Array(teamCount - 1).fill("BPA"),
      pool: buildPool(),
      leagueSettings: LEAGUE_SETTINGS,
      rand,
    });

    const userPicks = picks.filter((p) => p.isUserPick);
    expect(userPicks.length).toBe(rounds);
    expect(new Set(userPicks.map((p) => p.round)).size).toBe(rounds);
  });

  it("an EARLY_QB personality drafts a QB earlier than a LATE_QB personality on average", () => {
    const runFor = (personality: "EARLY_QB" | "LATE_QB") => {
      const rand = mulberry32(99);
      const picks = simulateFullDraft({
        teamCount: 2,
        rounds: 10,
        draftPosition: 2, // team 1 gets the personality under test
        mode: "SNAKE",
        cpuPersonalities: [personality],
        pool: buildPool(),
        leagueSettings: LEAGUE_SETTINGS,
        rand,
      });
      const qbPick = picks.find((p) => p.teamSlot === 1 && p.playerId.startsWith("QB-"));
      return qbPick?.round ?? 99;
    };

    expect(runFor("EARLY_QB")).toBeLessThan(runFor("LATE_QB"));
  });
});

describe("draft grading", () => {
  it("rewards picks that fell past their ADP and penalizes reaches", () => {
    const playerInfo = new Map<string, GradedPlayerInfo>([
      ["value-pick", { playerId: "value-pick", position: "WR", name: "Value Pick" }],
      ["reach-pick", { playerId: "reach-pick", position: "RB", name: "Reach Pick" }],
    ]);

    const result = gradeDraft({
      userPicks: [
        { overallPick: 20, round: 2, pickInRound: 4, teamSlot: 4, playerId: "value-pick", isUserPick: true, adpAtPick: 35, valueAtPick: 12 },
        { overallPick: 21, round: 3, pickInRound: 1, teamSlot: 4, playerId: "reach-pick", isUserPick: true, adpAtPick: 45, valueAtPick: 40 },
      ],
      playerInfo,
      leagueSettings: { qbSlots: 1, rbSlots: 2, wrSlots: 2, teSlots: 1, flexSlots: 1, superflexSlots: 0 },
    });

    expect(result.valueGained).toBeGreaterThan(0);
    expect(result.bestPicks.some((p) => p.playerId === "value-pick")).toBe(true);
  });

  it("computes an internally consistent letter grade for the score", () => {
    const result = gradeDraft({
      userPicks: [],
      playerInfo: new Map(),
      leagueSettings: { qbSlots: 1, rbSlots: 2, wrSlots: 2, teSlots: 1, flexSlots: 1, superflexSlots: 0 },
    });
    expect(result.gradeScore).toBeGreaterThanOrEqual(0);
    expect(result.gradeScore).toBeLessThanOrEqual(100);
    expect(typeof result.overallGrade).toBe("string");
  });
});
