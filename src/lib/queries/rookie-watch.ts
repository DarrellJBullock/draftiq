import { prisma } from "@/lib/db/prisma";
import { PLAYER_INCLUDE_FOR, shapePlayer } from "./shape";

export async function getRookieWatch(seasonId: string, seasonYear: number) {
  const raw = await prisma.player.findMany({
    where: { isRookie: true, rookieProfile: { draftYear: seasonYear } },
    include: PLAYER_INCLUDE_FOR(seasonId, "PPR"),
  });
  const rookies = raw.map(shapePlayer).filter((p) => p.rookieProfile);

  const byOverallRank = [...rookies].sort((a, b) => (a.rookieProfile!.overallFantasyRank ?? 999) - (b.rookieProfile!.overallFantasyRank ?? 999));
  const withDelta = rookies.filter((p) => p.adp?.adpDelta !== null && p.adp?.adpDelta !== undefined);

  return {
    topRookies: byOverallRank.slice(0, 10),
    biggestRisers: [...withDelta].sort((a, b) => (a.adp!.adpDelta ?? 0) - (b.adp!.adpDelta ?? 0)).slice(0, 6),
    biggestFallers: [...withDelta].sort((a, b) => (b.adp!.adpDelta ?? 0) - (a.adp!.adpDelta ?? 0)).slice(0, 6),
    bestLandingSpots: [...rookies].sort((a, b) => (b.rookieProfile!.landingSpotScore ?? 0) - (a.rookieProfile!.landingSpotScore ?? 0)).slice(0, 6),
    bestValues: [...rookies]
      .filter((p) => p.adp?.overallADP)
      .sort((a, b) => (b.adp!.overallADP - (b.rookieProfile!.overallFantasyRank ?? 0) * 3) - (a.adp!.overallADP - (a.rookieProfile!.overallFantasyRank ?? 0) * 3))
      .slice(0, 6),
    sleepers: [...rookies]
      .filter((p) => (p.rookieProfile!.opportunityScore ?? 0) > 55 && (p.rookieProfile!.overallFantasyRank ?? 999) > 20)
      .sort((a, b) => (b.rookieProfile!.opportunityScore ?? 0) - (a.rookieProfile!.opportunityScore ?? 0))
      .slice(0, 6),
    redFlags: [...rookies]
      .filter((p) => (p.rookieProfile!.competitionScore ?? 0) > 65)
      .sort((a, b) => (b.rookieProfile!.competitionScore ?? 0) - (a.rookieProfile!.competitionScore ?? 0))
      .slice(0, 6),
    breakoutCandidates: [...rookies].sort((a, b) => (b.rookieProfile!.breakoutScore ?? 0) - (a.rookieProfile!.breakoutScore ?? 0)).slice(0, 8),
  };
}
