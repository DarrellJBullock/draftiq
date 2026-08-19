import { describe, expect, it } from "vitest";
import { calculateFantasyPoints, HALF_PPR_SCORING, PPR_SCORING, STANDARD_SCORING } from "@/lib/services/scoring";

describe("league scoring settings", () => {
  const stat = {
    passingYards: 300,
    passingTDs: 2,
    interceptions: 1,
    rushingYards: 20,
    rushingTDs: 1,
    receivingYards: 0,
    receivingTDs: 0,
    receptions: 0,
  };

  it("computes standard scoring with no PPR bonus", () => {
    const points = calculateFantasyPoints(stat, STANDARD_SCORING);
    // 300*0.04=12, 2*4=8, 1*-2=-2, 20*0.1=2, 1*6=6 => 26
    expect(points).toBeCloseTo(26, 5);
  });

  it("adds 0.5 per reception under half-PPR", () => {
    const withReceptions = calculateFantasyPoints({ ...stat, receptions: 6 }, HALF_PPR_SCORING);
    const without = calculateFantasyPoints(stat, HALF_PPR_SCORING);
    expect(withReceptions - without).toBeCloseTo(3, 5); // 6 * 0.5
  });

  it("adds 1 per reception under full PPR", () => {
    const withReceptions = calculateFantasyPoints({ ...stat, receptions: 6 }, PPR_SCORING);
    const without = calculateFantasyPoints(stat, PPR_SCORING);
    expect(withReceptions - without).toBeCloseTo(6, 5);
  });

  it("applies a TE premium bonus only when isTightEnd is true", () => {
    const settings = { ...PPR_SCORING, tePremiumBonus: 0.5 };
    const tePoints = calculateFantasyPoints({ receptions: 4 }, settings, true);
    const nonTePoints = calculateFantasyPoints({ receptions: 4 }, settings, false);
    expect(tePoints).toBeCloseTo(6, 5); // 4 * (1 + 0.5)
    expect(nonTePoints).toBeCloseTo(4, 5); // 4 * 1
  });

  it("a custom reception value changes reception scoring proportionally", () => {
    const custom = { ...STANDARD_SCORING, receptionPoints: 0.75 };
    const points = calculateFantasyPoints({ receptions: 8 }, custom);
    expect(points).toBeCloseTo(6, 5);
  });
});
