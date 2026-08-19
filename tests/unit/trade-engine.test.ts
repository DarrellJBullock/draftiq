import { describe, expect, it } from "vitest";
import { evaluateTrade, getRestOfSeasonProjection } from "@/lib/services/trade-engine";

describe("trade engine", () => {
  it("declares the side with more total value the winner", () => {
    const result = evaluateTrade(
      [{ playerId: "a", position: "WR", value: 90, risk: "LOW" }],
      [{ playerId: "b", position: "RB", value: 50, risk: "LOW" }]
    );
    expect(result.winner).toBe("A");
    expect(result.sideA.totalValue).toBeGreaterThan(result.sideB.totalValue);
  });

  it("calls a near-equal trade even", () => {
    const result = evaluateTrade(
      [{ playerId: "a", position: "WR", value: 70, risk: "LOW" }],
      [{ playerId: "b", position: "RB", value: 71, risk: "LOW" }]
    );
    expect(result.winner).toBe("even");
  });

  it("scales rest-of-season projection by weeks remaining", () => {
    expect(getRestOfSeasonProjection(340, 17, 17)).toBeCloseTo(340, 5);
    expect(getRestOfSeasonProjection(340, 0, 17)).toBeCloseTo(0, 5);
    expect(getRestOfSeasonProjection(340, 8.5, 17)).toBeCloseTo(170, 1);
  });
});
