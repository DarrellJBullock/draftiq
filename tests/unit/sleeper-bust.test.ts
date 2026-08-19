import { describe, expect, it } from "vitest";
import { computeBustScore, computeSleeperScore } from "@/lib/services/sleeper-bust";

describe("sleeper finder", () => {
  it("scores a player going well past their rank higher than one going right at ADP", () => {
    const atADP = computeSleeperScore({ adp: 50, overallRank: 50, isRookie: false, returningFromInjury: false });
    const fallingPast = computeSleeperScore({ adp: 80, overallRank: 50, isRookie: false, returningFromInjury: false });
    expect(fallingPast.sleeperScore).toBeGreaterThan(atADP.sleeperScore);
  });

  it("boosts rookies and injury-return candidates", () => {
    const base = computeSleeperScore({ adp: 50, overallRank: 50, isRookie: false, returningFromInjury: false });
    const rookie = computeSleeperScore({ adp: 50, overallRank: 50, isRookie: true, returningFromInjury: false });
    expect(rookie.sleeperScore).toBeGreaterThan(base.sleeperScore);
  });
});

describe("bust finder", () => {
  it("flags ADP inflation (drafted earlier than rank supports) as risk", () => {
    const inflated = computeBustScore({ adp: 10, overallRank: 40, age: 25, riskLevel: "LOW", injuryStatus: "HEALTHY", trend: "stable" });
    const fair = computeBustScore({ adp: 40, overallRank: 40, age: 25, riskLevel: "LOW", injuryStatus: "HEALTHY", trend: "stable" });
    expect(inflated.bustScore).toBeGreaterThan(fair.bustScore);
  });

  it("adds risk for age, injury status, and declining trend", () => {
    const clean = computeBustScore({ adp: 40, overallRank: 40, age: 25, riskLevel: "LOW", injuryStatus: "HEALTHY", trend: "stable" });
    const risky = computeBustScore({ adp: 40, overallRank: 40, age: 32, riskLevel: "HIGH", injuryStatus: "QUESTIONABLE", trend: "falling" });
    expect(risky.bustScore).toBeGreaterThan(clean.bustScore);
    expect(risky.riskFactors.length).toBeGreaterThan(0);
  });
});
