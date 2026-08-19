import { describe, expect, it } from "vitest";
import { getOverallPick, getPickOrder, getRoundAndPickInRound, getTeamSlotForPick } from "@/lib/services/draft-engine/pick-order";

describe("snake draft pick order", () => {
  it("reverses direction every other round", () => {
    const order = getPickOrder(10, 3, "SNAKE");
    const round1 = order.filter((p) => p.round === 1).map((p) => p.teamSlot);
    const round2 = order.filter((p) => p.round === 2).map((p) => p.teamSlot);
    const round3 = order.filter((p) => p.round === 3).map((p) => p.teamSlot);

    expect(round1).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(round2).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(round3).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("gives team 1 back-to-back picks at the round 1/2 turn", () => {
    const order = getPickOrder(8, 2, "SNAKE");
    const lastOfRound1 = order.find((p) => p.overallPick === 8)!;
    const firstOfRound2 = order.find((p) => p.overallPick === 9)!;
    expect(lastOfRound1.teamSlot).toBe(8);
    expect(firstOfRound2.teamSlot).toBe(8);
  });

  it("assigns strictly increasing overall pick numbers", () => {
    const order = getPickOrder(12, 16, "SNAKE");
    const overallPicks = order.map((p) => p.overallPick);
    expect(overallPicks).toEqual([...overallPicks].sort((a, b) => a - b));
    expect(new Set(overallPicks).size).toBe(overallPicks.length);
    expect(overallPicks.length).toBe(12 * 16);
  });
});

describe("linear draft pick order", () => {
  it("never reverses direction", () => {
    const order = getPickOrder(6, 4, "LINEAR");
    for (const round of [1, 2, 3, 4]) {
      const slots = order.filter((p) => p.round === round).map((p) => p.teamSlot);
      expect(slots).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });
});

describe("pick <-> overall pick helpers", () => {
  it("round trips overall pick to round/pick and back", () => {
    const teamCount = 12;
    for (let overallPick = 1; overallPick <= 12 * 5; overallPick++) {
      const { round, pickInRound } = getRoundAndPickInRound(teamCount, overallPick);
      expect(getOverallPick(teamCount, round, pickInRound)).toBe(overallPick);
    }
  });

  it("getTeamSlotForPick matches getPickOrder for snake drafts", () => {
    const teamCount = 10;
    const rounds = 6;
    const order = getPickOrder(teamCount, rounds, "SNAKE");
    for (const slot of order) {
      expect(getTeamSlotForPick(teamCount, "SNAKE", slot.overallPick)).toBe(slot.teamSlot);
    }
  });
});
