// Name pools used to generate the seed/demo player database.
//
// NOTE ON REALISM: the 2026 NFL Draft (and 2026 free-agency movement) had
// already happened by this app's "current date," but this project's model
// training data predates verified results for it. Rather than assert
// specific real people's names against team/draft-slot facts that can't be
// verified as accurate "as of today," every seeded Player (veterans and
// rookies alike) uses realistic-but-generated names. Team, schedule, and
// scoring structure are real; individual player identities are demo data,
// clearly marked `dataSource: SEED`, meant to be replaced by a live
// provider or CSV import (see lib/services/providers) once one is wired up.

export const FIRST_NAMES = [
  "Jalen", "Trevor", "Malik", "Caleb", "Marvin", "Jordan", "Terry", "Xavier",
  "DeAndre", "Amari", "Tyreek", "Justin", "Josh", "Patrick", "Lamar", "Joe",
  "Dak", "Brock", "Bryce", "Anthony", "CJ", "Bijan", "Jahmyr", "Breece",
  "Kenneth", "Travis", "Rachaad", "Isiah", "Najee", "De'Von", "Aaron", "Zack",
  "Devon", "Rome", "Chris", "Nico", "Ladd", "Garrett", "George", "Drake",
  "Christian", "Alvin", "Derrick", "Saquon", "Austin", "Sam", "Cooper",
  "Michael", "Jaylen", "Courtland", "DJ", "Diontae", "Tank", "Chris",
  "Keenan", "Mike", "Davante", "Stefon", "DK", "Terry", "Brandon", "Jerry",
  "Rashee", "Jameson", "Jaxon", "Zay", "Marquise", "Elijah", "Rashid",
  "Kyle", "Dallas", "Trey", "Evan", "Cade", "Cole", "Dalton", "Hunter",
  "Mark", "Tyler", "Noah", "Jake", "Will", "Ryan", "Nick", "Matt", "Sean",
  "Brandin", "Calvin", "Deebo", "Tee", "Chris", "Adam", "Allen", "Curtis",
  "Romeo", "Xavier", "Wan'Dale", "Skyy", "Rondale", "Jerry", "Treylon",
  "Jayden", "Jaylen", "Roschon", "Tyjae", "Kaleb", "Quinshon", "Omarion",
  "TreVeyon", "Ollie", "Braelon", "Blake", "Will", "Cam", "Emeka", "Luther",
] as const;

export const LAST_NAMES = [
  "Carter", "Reynolds", "Whitfield", "Douglas", "Rutherford", "Sinclair",
  "Mercer", "Griffin", "Hastings", "Colby", "Marsh", "Ellison", "Prescott",
  "Vance", "Boone", "Harmon", "Kessler", "Radcliffe", "Warfield", "Landry",
  "Barrow", "Mosley", "Danforth", "Sutherland", "Winters", "Pruitt",
  "Castillo", "Delgado", "Navarro", "Whitaker", "Sherwood", "Blackwood",
  "Ashford", "Calloway", "Donovan", "Everhart", "Fairweather", "Galloway",
  "Hensley", "Ivory", "Jansen", "Kirkland", "Lockwood", "Merritt", "Norwood",
  "Ostrander", "Pemberton", "Quintero", "Ramsdell", "Stanfield", "Thackeray",
  "Underhill", "Vasquez", "Wakefield", "Yardley", "Zimmerman", "Bellweather",
  "Cromwell", "Dashiell", "Emberton", "Foxworth", "Granderson", "Holloway",
  "Ibarra", "Jettson", "Kilbride", "Larkspur", "Montrose", "Nightingale",
  "Okafor", "Pennington", "Quillan", "Ridgeway", "Stallworth", "Trevino",
  "Underwood", "Valentine", "Westbrook", "Ashworth", "Brightwater",
  "Cavanaugh", "Drummond", "Ellsworth", "Farrow", "Grantham",
] as const;

export const COLLEGES = [
  "Ohio State", "Alabama", "Georgia", "LSU", "Michigan", "Texas", "Oregon",
  "Penn State", "Florida State", "USC", "Clemson", "Notre Dame", "Tennessee",
  "Oklahoma", "Miami", "Washington", "Utah", "Wisconsin", "Iowa", "Missouri",
  "Ole Miss", "Texas A&M", "North Carolina", "Louisville", "TCU", "Baylor",
  "Arizona State", "Colorado", "Kansas State", "Boise State", "Memphis",
  "Toledo", "Marshall", "James Madison", "Troy", "Coastal Carolina",
] as const;

export const HOMETOWNS = [
  "Atlanta, GA", "Houston, TX", "Miami, FL", "Dallas, TX", "Detroit, MI",
  "Cleveland, OH", "Baton Rouge, LA", "Columbus, OH", "Charlotte, NC",
  "Memphis, TN", "St. Louis, MO", "Jacksonville, FL", "Newark, NJ",
  "Baltimore, MD", "Tampa, FL", "Phoenix, AZ", "San Antonio, TX",
  "Cincinnati, OH", "Pittsburgh, PA", "Nashville, TN", "Kansas City, MO",
  "New Orleans, LA", "Chicago, IL", "Richmond, VA", "Columbia, SC",
] as const;

let usedFullNames = new Set<string>();

export function resetNamePool() {
  usedFullNames = new Set<string>();
}

export function uniqueFullName(rand: () => number): { firstName: string; lastName: string } {
  for (let attempt = 0; attempt < 200; attempt++) {
    const firstName = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]!;
    const lastName = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]!;
    const key = `${firstName} ${lastName}`;
    if (!usedFullNames.has(key)) {
      usedFullNames.add(key);
      return { firstName, lastName };
    }
  }
  const suffix = usedFullNames.size;
  const firstName = FIRST_NAMES[suffix % FIRST_NAMES.length]!;
  const lastName = `${LAST_NAMES[suffix % LAST_NAMES.length]}${suffix}`;
  usedFullNames.add(`${firstName} ${lastName}`);
  return { firstName, lastName };
}
