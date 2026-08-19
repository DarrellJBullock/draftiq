import { describe, expect, it } from "vitest";
import { computeRookieScores, rankRookieClass, type RookieRawInput } from "@/lib/services/rookie-engine";

function input(overrides: Partial<RookieRawInput> = {}): RookieRawInput {
  return {
    position: "WR",
    draftPick: 20,
    projectedVolumeShare: 0.5,
    depthChartOpenness: 0.5,
    offenseQualityScore: 0.5,
    projectedFantasyPoints: 150,
    floorPoints: 100,
    ceilingPoints: 220,
    ...overrides,
  };
}

describe("rookie engine scoring", () => {
  it("gives earlier draft picks a higher draft capital score", () => {
    const early = computeRookieScores(input({ draftPick: 3 }));
    const late = computeRookieScores(input({ draftPick: 200 }));
    expect(early.draftCapitalScore).toBeGreaterThan(late.draftCapitalScore);
  });

  it("gives a wide-open depth chart a higher opportunity and lower competition score", () => {
    const open = computeRookieScores(input({ depthChartOpenness: 0.95 }));
    const buried = computeRookieScores(input({ depthChartOpenness: 0.05 }));
    expect(open.opportunityScore).toBeGreaterThan(buried.opportunityScore);
    expect(open.competitionScore).toBeLessThan(buried.competitionScore);
  });

  it("all scores stay within 0-100", () => {
    const scores = computeRookieScores(input({ draftPick: 1, depthChartOpenness: 1, offenseQualityScore: 1, ceilingPoints: 1000 }));
    for (const v of Object.values(scores)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe("rookie class ranking", () => {
  it("ranks within position by projected fantasy points", () => {
    const rookies = [
      { id: "a", position: "RB" as const, projectedFantasyPoints: 200, breakoutScore: 60, landingSpotScore: 60 },
      { id: "b", position: "RB" as const, projectedFantasyPoints: 100, breakoutScore: 60, landingSpotScore: 60 },
      { id: "c", position: "WR" as const, projectedFantasyPoints: 150, breakoutScore: 60, landingSpotScore: 60 },
    ];
    const results = rankRookieClass(rookies);
    const a = results.find((r) => r.id === "a")!;
    const b = results.find((r) => r.id === "b")!;
    const c = results.find((r) => r.id === "c")!;

    expect(a.positionRank).toBe(1);
    expect(b.positionRank).toBe(2);
    expect(c.positionRank).toBe(1); // only WR in the class
  });

  it("assigns a unique overall rank to every rookie, best breakout score first", () => {
    const rookies = [
      { id: "a", position: "RB" as const, projectedFantasyPoints: 100, breakoutScore: 90, landingSpotScore: 80 },
      { id: "b", position: "WR" as const, projectedFantasyPoints: 100, breakoutScore: 40, landingSpotScore: 40 },
    ];
    const results = rankRookieClass(rookies);
    const a = results.find((r) => r.id === "a")!;
    const b = results.find((r) => r.id === "b")!;
    expect(a.overallFantasyRank).toBe(1);
    expect(b.overallFantasyRank).toBe(2);
  });

  it("assigns tiers 1-4 based on within-position rank order", () => {
    const rookies = Array.from({ length: 12 }, (_, i) => ({
      id: `p${i}`,
      position: "WR" as const,
      projectedFantasyPoints: 200 - i * 10,
      breakoutScore: 50,
      landingSpotScore: 50,
    }));
    const results = rankRookieClass(rookies);
    const tiers = results.map((r) => r.rookieTier);
    expect(Math.min(...tiers)).toBe(1);
    expect(Math.max(...tiers)).toBeLessThanOrEqual(4);
    // Best player should be tier 1
    const best = results.find((r) => r.id === "p0")!;
    expect(best.rookieTier).toBe(1);
  });
});
