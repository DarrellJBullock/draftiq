import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { getOrCreateLiveDraft, getDraftById } from "@/lib/queries/drafts";
import { getValuedPlayerPool } from "@/lib/queries/value-pool";
import { getTeamSlotForPick } from "@/lib/services/draft-engine";
import { computeSleeperScore } from "@/lib/services/sleeper-bust";
import { SKILL_POSITIONS } from "@/types";
import type { Position } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DraftDayBoard, type AvailablePlayer } from "./draft-day-board";

export default async function DraftDayPage() {
  const [season, user] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo()]);
  const league = await getOrCreateDefaultLeague(user.id);
  const settings = league.settings!;

  const draft = await getOrCreateLiveDraft(user.id, { season: season.year, teamCount: league.teamCount, rounds: 16, draftPosition: 1, mode: "SNAKE" });

  const [draftRecord, pool] = await Promise.all([
    getDraftById(draft.id),
    getValuedPlayerPool(season.id, league.scoringFormatPreset),
  ]);

  const drafted = draftRecord!;
  const draftedIds = new Set(drafted.picks.map((p) => p.playerId).filter((id): id is string => !!id));

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
        description={`${league.name} · ${drafted.teamCount}-team ${drafted.mode.toLowerCase()} draft · ${league.scoringFormatPreset.replace("_", " ")}`}
      />

      {isComplete ? (
        <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          This draft is complete. Head to Team Builder to review your roster, or start a new live draft from the database directly.
        </p>
      ) : (
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
        />
      )}
    </div>
  );
}
