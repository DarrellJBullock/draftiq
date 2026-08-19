import { describe, expect, it } from "vitest";
import { calculateValue, computePositionPoolStats, type ValueContext } from "@/lib/services/value-engine";

function baseContext(overrides: Partial<ValueContext> = {}): ValueContext {
  return {
    projectedPoints: 250,
    floor: 180,
    ceiling: 320,
    overallRank: 10,
    adp: 10,
    rosterNeed: 0.5,
    tierDropoffPoints: 5,
    riskLevel: "LOW",
    byeWeekConflicts: 0,
    positionStats: { replacementPoints: 150, bestPoints: 320, worstPoints: 60 },
    ...overrides,
  };
}

describe("value engine", () => {
  it("scores a top-tier low-risk player highly", () => {
    const result = calculateValue(baseContext());
    expect(result.overallValue).toBeGreaterThan(50);
  });

  it("rewards players whose ADP is later than their rank (market value)", () => {
    const valueAtADP = calculateValue(baseContext({ overallRank: 10, adp: 10 }));
    const fallingPastRank = calculateValue(baseContext({ overallRank: 10, adp: 30 }));
    expect(fallingPastRank.draftValue).toBeGreaterThan(valueAtADP.draftValue);
  });

  it("penalizes reaches (ADP much earlier than rank)", () => {
    const reach = calculateValue(baseContext({ overallRank: 40, adp: 10 }));
    const onSlot = calculateValue(baseContext({ overallRank: 10, adp: 10 }));
    expect(reach.draftValue).toBeLessThan(onSlot.draftValue);
  });

  it("higher risk lowers risk-adjusted value but not raw projection value", () => {
    const low = calculateValue(baseContext({ riskLevel: "LOW" }));
    const high = calculateValue(baseContext({ riskLevel: "HIGH" }));
    expect(high.riskAdjustedValue).toBeLessThan(low.riskAdjustedValue);
  });

  it("roster need increases overall value at equal talent", () => {
    const noNeed = calculateValue(baseContext({ rosterNeed: 0 }));
    const highNeed = calculateValue(baseContext({ rosterNeed: 1 }));
    expect(highNeed.overallValue).toBeGreaterThan(noNeed.overallValue);
  });

  it("bye week conflicts reduce overall value", () => {
    const noConflict = calculateValue(baseContext({ byeWeekConflicts: 0 }));
    const conflict = calculateValue(baseContext({ byeWeekConflicts: 3 }));
    expect(conflict.overallValue).toBeLessThan(noConflict.overallValue);
  });

  it("scores stay within the 0-100 range", () => {
    const extreme = calculateValue(
      baseContext({ projectedPoints: 1000, adp: 500, overallRank: 1, rosterNeed: 1, byeWeekConflicts: 10, riskLevel: "HIGH" })
    );
    for (const v of Object.values(extreme)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe("position scarcity (pool stats)", () => {
  it("uses the pick after the starter count as the replacement baseline", () => {
    const points = [300, 280, 260, 240, 220, 200, 180];
    const stats = computePositionPoolStats(points, 3);
    expect(stats.bestPoints).toBe(300);
    expect(stats.replacementPoints).toBe(240); // index 3 (0-indexed) = 4th player
    expect(stats.worstPoints).toBe(180);
  });

  it("a scarcer position (big gap best->replacement) yields a bigger positionValue swing than a deep one", () => {
    const scarcePool = computePositionPoolStats([300, 200, 150, 100], 1); // replacement = 200, huge drop from best
    const deepPool = computePositionPoolStats([300, 295, 290, 285], 1); // replacement = 295, flat

    const scarce = calculateValue(baseContext({ positionStats: scarcePool, projectedPoints: 300 }));
    const deep = calculateValue(baseContext({ positionStats: deepPool, projectedPoints: 300 }));

    expect(scarce.positionValue).toBeGreaterThan(deep.positionValue);
  });
});
