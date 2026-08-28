import { describe, expect, it } from "vitest";
import { calculateDdaflAdjustment, computePositionAverageYPT, yardsPerTouch, type DdaflAdjustmentInput } from "@/lib/services/scoring/ddafl-adjustment";

function rb(rushAttempts: number, rushingYards: number): DdaflAdjustmentInput {
  return { position: "RB", rushAttempts, rushingYards };
}

describe("yardsPerTouch", () => {
  it("computes rushing yards per carry for a RB above the sample floor", () => {
    expect(yardsPerTouch(rb(200, 1000))).toBe(5);
  });

  it("returns null below the minimum touch threshold", () => {
    expect(yardsPerTouch(rb(5, 50))).toBeNull();
  });

  it("computes receiving yards per catch for a WR", () => {
    expect(yardsPerTouch({ position: "WR", receptions: 80, receivingYards: 1200 })).toBe(15);
  });

  it("computes passing yards per attempt for a QB", () => {
    expect(yardsPerTouch({ position: "QB", attempts: 500, passingYards: 4000 })).toBe(8);
  });

  it("returns null for positions with no defined touch type", () => {
    expect(yardsPerTouch({ position: "K" })).toBeNull();
    expect(yardsPerTouch({ position: "DST" })).toBeNull();
  });
});

describe("computePositionAverageYPT", () => {
  it("averages only players at the given position above the sample floor", () => {
    const players = [rb(200, 1000), rb(200, 800), { position: "WR" as const, receptions: 80, receivingYards: 1200 }];
    expect(computePositionAverageYPT(players, "RB")).toBe(4.5);
  });

  it("returns null when nobody at that position clears the sample floor", () => {
    expect(computePositionAverageYPT([rb(5, 50)], "RB")).toBeNull();
  });
});

describe("calculateDdaflAdjustment", () => {
  it("boosts an above-average-efficiency player", () => {
    const explosive = rb(200, 1400); // 7.0 ypc vs a 5.0 average
    expect(calculateDdaflAdjustment(explosive, 5)).toBeGreaterThan(1);
  });

  it("penalizes a below-average-efficiency compiler", () => {
    const compiler = rb(300, 1050); // 3.5 ypc vs a 5.0 average
    expect(calculateDdaflAdjustment(compiler, 5)).toBeLessThan(1);
  });

  it("caps the adjustment within the calibrated range", () => {
    const wildOutlier = rb(200, 4000); // absurd 20 ypc
    const adjustment = calculateDdaflAdjustment(wildOutlier, 5);
    expect(adjustment).toBeLessThanOrEqual(1.13);
  });

  it("returns 1 (no adjustment) for a too-small sample", () => {
    expect(calculateDdaflAdjustment(rb(5, 80), 5)).toBe(1);
  });

  it("returns 1 (no adjustment) when there's no position average to compare against", () => {
    expect(calculateDdaflAdjustment(rb(200, 1000), null)).toBe(1);
  });

  it("returns 1 for positions with no defined touch type (K/DST)", () => {
    expect(calculateDdaflAdjustment({ position: "K" }, 5)).toBe(1);
  });
});
