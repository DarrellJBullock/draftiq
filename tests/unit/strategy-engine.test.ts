import { describe, expect, it } from "vitest";
import { recommendStrategies } from "@/lib/services/strategy-engine";

describe("strategy engine", () => {
  it("recommends EARLY_QB for superflex leagues", () => {
    const results = recommendStrategies({
      teamCount: 12,
      draftPosition: 6,
      qbSlots: 1,
      superflexSlots: 1,
      teSlots: 1,
      tePremiumBonus: 0,
      receptionPoints: 1,
      benchSize: 6,
    });
    expect(results[0]!.strategy).toBe("EARLY_QB");
  });

  it("recommends ELITE_TE for TE premium leagues", () => {
    const results = recommendStrategies({
      teamCount: 12,
      draftPosition: 6,
      qbSlots: 1,
      superflexSlots: 0,
      teSlots: 1,
      tePremiumBonus: 1.5,
      receptionPoints: 1,
      benchSize: 6,
    });
    expect(results[0]!.strategy).toBe("ELITE_TE");
  });

  it("returns every strategy exactly once, sorted by descending fit score", () => {
    const results = recommendStrategies({
      teamCount: 10,
      draftPosition: 5,
      qbSlots: 1,
      superflexSlots: 0,
      teSlots: 1,
      tePremiumBonus: 0,
      receptionPoints: 0.5,
      benchSize: 6,
    });
    expect(results.length).toBe(10);
    expect(new Set(results.map((r) => r.strategy)).size).toBe(10);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.fitScore).toBeGreaterThanOrEqual(results[i]!.fitScore);
    }
  });
});
