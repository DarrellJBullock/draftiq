import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { getOrCreateLiveDraft, getDraftById, getLeagueConferences } from "@/lib/queries/drafts";
import { getValuedPlayerPool } from "@/lib/queries/value-pool";
import { getTeamSlotForPick } from "@/lib/services/draft-engine";
import { computeSleeperScore } from "@/lib/services/sleeper-bust";
import { SKILL_POSITIONS } from "@/types";
import type { Position } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DraftDayBoard, type AvailablePlayer } from "./draft-day-board";
import { KeeperPanel, type KeeperRow } from "./keeper-panel";
import { ConferenceSwitcher } from "./conference-switcher";
import { MflSyncPanel } from "./mfl-sync-panel";
import { prisma } from "@/lib/db/prisma";

export default async function DraftDayPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const conferenceParam = typeof raw.conference === "string" && raw.conference.trim() ? raw.conference.trim() : undefined;

  const [season, user] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo()]);
  const league = await getOrCreateDefaultLeague(user.id);
  const settings = league.settings!;
  const defaultRounds =
    settings.qbSlots + settings.rbSlots + settings.wrSlots + settings.teSlots + settings.flexSlots + settings.superflexSlots + (settings.kSlot ? 1 : 0) + (settings.dstSlot ? 1 : 0) + settings.benchSize;

  const knownConferences = await getLeagueConferences(league.id);
  const conference = conferenceParam ?? knownConferences[0];

  // If this conference already has a draft (mock or live), reuse its team
  // count. Otherwise, if a *different* conference already exists, reuse
  // that one's count (keeps NFC/AFC symmetric); if this is the very first
  // conference this league has ever used, assume a 2-way split.
  let defaultTeamCount = league.teamCount;
  if (conference) {
    const sameConference = await prisma.draft.findFirst({ where: { leagueId: league.id, conference }, orderBy: { createdAt: "desc" } });
    if (sameConference) {
      defaultTeamCount = sameConference.teamCount;
    } else {
      const otherConference = knownConferences.length > 0 ? await prisma.draft.findFirst({ where: { leagueId: league.id, conference: knownConferences[0] } }) : null;
      defaultTeamCount = otherConference?.teamCount ?? Math.round(league.teamCount / 2);
    }
  }

  const draft = await getOrCreateLiveDraft(user.id, {
    leagueId: league.id,
    conference,
    season: season.year,
    teamCount: defaultTeamCount,
    rounds: defaultRounds,
    draftPosition: 1,
    mode: "SNAKE",
  });

  const [draftRecord, pool] = await Promise.all([
    getDraftById(draft.id),
    getValuedPlayerPool(season.id, league.scoringFormatPreset),
  ]);

  const drafted = draftRecord!;
  const tabConferences = conference && !knownConferences.includes(conference) ? [...knownConferences, conference] : knownConferences;
  const draftedIds = new Set(drafted.picks.map((p) => p.playerId).filter((id): id is string => !!id));
  const keepers: KeeperRow[] = drafted.picks
    .filter((p) => p.isKeeper)
    .map((p) => ({ id: p.id, teamSlot: p.teamSlot, isUserPick: p.isUserPick, player: p.player }));

  const available: AvailablePlayer[] = pool
    .filter((p) => !draftedIds.has(p.id))
    .map((p) => {
      const sleeper =
        p.adp?.overallADP && p.ranking?.overallRank
          ? computeSleeperScore({
              adp: p.adp.overallADP,
              overallRank: p.ranking.overallRank,
              isRookie: p.isRookie,
              returningFromInjury: p.returningFromInjury,
              opportunityScore: p.rookieProfile?.opportunityScore ?? undefined,
            }).sleeperScore
          : 0;
      return { ...p, ...p.value, sleeperScore: sleeper };
    });

  const userPicks = drafted.picks.filter((p) => p.isUserPick && p.player);
  const havePosition = (pos: Position) => userPicks.filter((p) => p.player!.position === pos).length;

  const positionNeeds = [
    { position: "QB" as Position, have: havePosition("QB"), need: settings.qbSlots },
    { position: "RB" as Position, have: havePosition("RB"), need: settings.rbSlots },
    { position: "WR" as Position, have: havePosition("WR"), need: settings.wrSlots },
    { position: "TE" as Position, have: havePosition("TE"), need: settings.teSlots },
  ].filter((n) => SKILL_POSITIONS.includes(n.position));

  const onTheClock = getTeamSlotForPick(drafted.teamCount, drafted.mode, drafted.currentPick);
  const isComplete = drafted.status === "COMPLETED";

  return (
    <div>
      <PageHeader
        title="Draft Day"
        description={`${league.name}${conference ? ` · ${conference}` : ""} · ${drafted.teamCount}-team ${drafted.mode.toLowerCase()} draft · ${league.scoringFormatPreset.replace("_", " ")}`}
      />

      <ConferenceSwitcher conferences={tabConferences} active={conference} />

      {isComplete ? (
        <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          This draft is complete. Head to Team Builder to review your roster, or start a new live draft from the database directly.
        </p>
      ) : (
        <>
          {league.mflLeagueId && league.mflHost ? (
            <MflSyncPanel draftId={drafted.id} season={season.year} scoringFormat={league.scoringFormatPreset} />
          ) : null}
          <KeeperPanel draftId={drafted.id} teamCount={drafted.teamCount} season={season.year} scoringFormat={league.scoringFormatPreset} keepers={keepers} />
          <DraftDayBoard
            draftId={drafted.id}
            season={season.year}
            scoringFormat={league.scoringFormatPreset}
            currentRound={drafted.currentRound}
            currentPick={drafted.currentPick}
            userDraftPosition={drafted.userDraftPosition}
            onTheClock={onTheClock}
            players={available}
            positionNeeds={positionNeeds}
            showDdaflAdjustment={!!league.mflLeagueId}
          />
        </>
      )}
    </div>
  );
}
