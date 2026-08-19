// Real NFL team reference data (names, cities, conferences, divisions, and
// commonly-published brand colors). This is factual public information, not
// copyrighted creative assets -- no logos or imagery are included.

export interface SeedTeam {
  abbreviation: string;
  name: string;
  city: string;
  conference: "AFC" | "NFC";
  division: "East" | "North" | "South" | "West";
  primaryColor: string;
  secondaryColor: string;
}

export const NFL_TEAMS: SeedTeam[] = [
  { abbreviation: "BUF", name: "Bills", city: "Buffalo", conference: "AFC", division: "East", primaryColor: "#00338D", secondaryColor: "#C60C30" },
  { abbreviation: "MIA", name: "Dolphins", city: "Miami", conference: "AFC", division: "East", primaryColor: "#008E97", secondaryColor: "#FC4C02" },
  { abbreviation: "NE", name: "Patriots", city: "New England", conference: "AFC", division: "East", primaryColor: "#002244", secondaryColor: "#C60C30" },
  { abbreviation: "NYJ", name: "Jets", city: "New York", conference: "AFC", division: "East", primaryColor: "#125740", secondaryColor: "#000000" },
  { abbreviation: "BAL", name: "Ravens", city: "Baltimore", conference: "AFC", division: "North", primaryColor: "#241773", secondaryColor: "#9E7C0C" },
  { abbreviation: "CIN", name: "Bengals", city: "Cincinnati", conference: "AFC", division: "North", primaryColor: "#FB4F14", secondaryColor: "#000000" },
  { abbreviation: "CLE", name: "Browns", city: "Cleveland", conference: "AFC", division: "North", primaryColor: "#311D00", secondaryColor: "#FF3C00" },
  { abbreviation: "PIT", name: "Steelers", city: "Pittsburgh", conference: "AFC", division: "North", primaryColor: "#FFB612", secondaryColor: "#101820" },
  { abbreviation: "HOU", name: "Texans", city: "Houston", conference: "AFC", division: "South", primaryColor: "#03202F", secondaryColor: "#A71930" },
  { abbreviation: "IND", name: "Colts", city: "Indianapolis", conference: "AFC", division: "South", primaryColor: "#002C5F", secondaryColor: "#A2AAAD" },
  { abbreviation: "JAX", name: "Jaguars", city: "Jacksonville", conference: "AFC", division: "South", primaryColor: "#101820", secondaryColor: "#D7A22A" },
  { abbreviation: "TEN", name: "Titans", city: "Tennessee", conference: "AFC", division: "South", primaryColor: "#0C2340", secondaryColor: "#4B92DB" },
  { abbreviation: "DEN", name: "Broncos", city: "Denver", conference: "AFC", division: "West", primaryColor: "#FB4F14", secondaryColor: "#002244" },
  { abbreviation: "KC", name: "Chiefs", city: "Kansas City", conference: "AFC", division: "West", primaryColor: "#E31837", secondaryColor: "#FFB81C" },
  { abbreviation: "LV", name: "Raiders", city: "Las Vegas", conference: "AFC", division: "West", primaryColor: "#000000", secondaryColor: "#A5ACAF" },
  { abbreviation: "LAC", name: "Chargers", city: "Los Angeles", conference: "AFC", division: "West", primaryColor: "#0080C6", secondaryColor: "#FFC20E" },
  { abbreviation: "DAL", name: "Cowboys", city: "Dallas", conference: "NFC", division: "East", primaryColor: "#041E42", secondaryColor: "#869397" },
  { abbreviation: "NYG", name: "Giants", city: "New York", conference: "NFC", division: "East", primaryColor: "#0B2265", secondaryColor: "#A71930" },
  { abbreviation: "PHI", name: "Eagles", city: "Philadelphia", conference: "NFC", division: "East", primaryColor: "#004C54", secondaryColor: "#A5ACAF" },
  { abbreviation: "WAS", name: "Commanders", city: "Washington", conference: "NFC", division: "East", primaryColor: "#5A1414", secondaryColor: "#FFB612" },
  { abbreviation: "CHI", name: "Bears", city: "Chicago", conference: "NFC", division: "North", primaryColor: "#0B162A", secondaryColor: "#C83803" },
  { abbreviation: "DET", name: "Lions", city: "Detroit", conference: "NFC", division: "North", primaryColor: "#0076B6", secondaryColor: "#B0B7BC" },
  { abbreviation: "GB", name: "Packers", city: "Green Bay", conference: "NFC", division: "North", primaryColor: "#203731", secondaryColor: "#FFB612" },
  { abbreviation: "MIN", name: "Vikings", city: "Minnesota", conference: "NFC", division: "North", primaryColor: "#4F2683", secondaryColor: "#FFC62F" },
  { abbreviation: "ATL", name: "Falcons", city: "Atlanta", conference: "NFC", division: "South", primaryColor: "#A71930", secondaryColor: "#000000" },
  { abbreviation: "CAR", name: "Panthers", city: "Carolina", conference: "NFC", division: "South", primaryColor: "#0085CA", secondaryColor: "#101820" },
  { abbreviation: "NO", name: "Saints", city: "New Orleans", conference: "NFC", division: "South", primaryColor: "#D3BC8D", secondaryColor: "#101820" },
  { abbreviation: "TB", name: "Buccaneers", city: "Tampa Bay", conference: "NFC", division: "South", primaryColor: "#D50A0A", secondaryColor: "#34302B" },
  { abbreviation: "ARI", name: "Cardinals", city: "Arizona", conference: "NFC", division: "West", primaryColor: "#97233F", secondaryColor: "#000000" },
  { abbreviation: "LAR", name: "Rams", city: "Los Angeles", conference: "NFC", division: "West", primaryColor: "#003594", secondaryColor: "#FFA300" },
  { abbreviation: "SF", name: "49ers", city: "San Francisco", conference: "NFC", division: "West", primaryColor: "#AA0000", secondaryColor: "#B3995D" },
  { abbreviation: "SEA", name: "Seahawks", city: "Seattle", conference: "NFC", division: "West", primaryColor: "#002244", secondaryColor: "#69BE28" },
];

// 2026 bye weeks are illustrative seed data (spread across weeks 5-14) --
// replace via a live provider or CSV import once the real schedule drops.
export function seedByeWeek(abbreviation: string): number {
  let hash = 0;
  for (const ch of abbreviation) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return 5 + (hash % 10);
}
