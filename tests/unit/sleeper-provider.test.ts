import { describe, expect, it } from "vitest";
import { mapSleeperPlayer, type SleeperPlayer } from "@/lib/services/providers/sleeper-provider";

// Fixtures captured from a live GET https://api.sleeper.app/v1/players/nfl response.
const MAHOMES: SleeperPlayer = {
  player_id: "4046",
  first_name: "Patrick",
  last_name: "Mahomes",
  position: "QB",
  team: "KC",
  number: 15,
  college: "Texas Tech",
  age: 30,
  years_exp: 9,
  active: true,
  status: "Active",
  injury_status: "Questionable",
  sport: "nfl",
};

const NINERS_DEF: SleeperPlayer = {
  player_id: "SF",
  first_name: "San Francisco",
  last_name: "49ers",
  position: "DEF",
  team: "SF",
  number: null,
  college: null,
  age: null,
  years_exp: null,
  active: true,
  status: "Active",
  injury_status: null,
  sport: "nfl",
};

const ROOKIE_WR: SleeperPlayer = {
  player_id: "12345",
  first_name: "Elijah",
  last_name: "Sarratt",
  position: "WR",
  team: "BAL",
  number: null,
  college: "Indiana",
  age: 23,
  years_exp: 0,
  active: true,
  status: "Active",
  injury_status: null,
  sport: "nfl",
};

const OFFENSIVE_LINEMAN: SleeperPlayer = {
  player_id: "99999",
  first_name: "Some",
  last_name: "Tackle",
  position: "OT",
  team: "DAL",
  number: 71,
  college: null,
  age: 27,
  years_exp: 5,
  active: true,
  status: "Active",
  injury_status: null,
  sport: "nfl",
};

describe("mapSleeperPlayer", () => {
  it("maps a veteran skill player, including a mapped injury status", () => {
    const result = mapSleeperPlayer(MAHOMES);
    expect(result).toEqual({
      externalId: "4046",
      firstName: "Patrick",
      lastName: "Mahomes",
      position: "QB",
      nflTeamAbbreviation: "KC",
      jerseyNumber: 15,
      college: "Texas Tech",
      age: 30,
      isRookie: false,
      isFreeAgent: false,
      injuryStatus: "QUESTIONABLE",
    });
  });

  it("maps Sleeper's DEF position onto our DST position", () => {
    const result = mapSleeperPlayer(NINERS_DEF);
    expect(result?.position).toBe("DST");
    expect(result?.firstName).toBe("San Francisco");
    expect(result?.lastName).toBe("49ers");
  });

  it("flags a zero-years-experience player as a rookie", () => {
    const result = mapSleeperPlayer(ROOKIE_WR);
    expect(result?.isRookie).toBe(true);
    expect(result?.isFreeAgent).toBe(false);
  });

  it("omits injuryStatus entirely when Sleeper reports none, rather than defaulting it", () => {
    const result = mapSleeperPlayer(ROOKIE_WR);
    expect(result).not.toHaveProperty("injuryStatus");
  });

  it("returns null for positions we don't track (IDP/offensive line/etc.)", () => {
    expect(mapSleeperPlayer(OFFENSIVE_LINEMAN)).toBeNull();
  });

  it("marks a teamless player as a free agent", () => {
    const result = mapSleeperPlayer({ ...MAHOMES, team: null });
    expect(result?.isFreeAgent).toBe(true);
    expect(result?.nflTeamAbbreviation).toBeNull();
  });
});
