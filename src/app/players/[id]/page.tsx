import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  GraduationCap,
  Ruler,
  Weight,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { getPlayerDetail, getPlayersByIds } from "@/lib/queries/players";
import { MetricCard } from "@/components/shared/metric-card";
import { PositionBadge } from "@/components/shared/position-badge";
import { RookieBadge } from "@/components/shared/rookie-badge";
import { InjuryBadge } from "@/components/shared/player-card";
import { ValueIndicator } from "@/components/shared/value-indicator";
import { ProjectionChart } from "@/components/shared/projection-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

function formatHeight(inches: number | null) {
  if (!inches) return "-";
  const feet = Math.floor(inches / 12);
  const remainder = inches % 12;
  return `${feet}'${remainder}"`;
}

function trendIcon(trend: string | null | undefined) {
  if (trend === "rising") return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (trend === "falling") return <TrendingDown className="h-3.5 w-3.5 text-rose-400" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function NoteList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-1.5 space-y-1 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted-foreground">&bull;</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [season, user] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo()]);
  const league = await getOrCreateDefaultLeague(user.id);

  const player = await getPlayerDetail(id, season.id, league.scoringFormatPreset);
  if (!player) notFound();

  const comparableIds = player.playerSeason?.comparablePlayerIds ?? [];
  const comparablePlayers = comparableIds.length
    ? await getPlayersByIds(comparableIds, season.id, league.scoringFormatPreset)
    : [];

  const hasScoutingNotes =
    (player.playerSeason?.strengths?.length ?? 0) > 0 ||
    (player.playerSeason?.weaknesses?.length ?? 0) > 0 ||
    (player.playerSeason?.riskFactors?.length ?? 0) > 0 ||
    !!player.playerSeason?.teamSituation ||
    !!player.playerSeason?.depthChartCompetition;

  const proj = player.projection;
  const rp = player.rookieProfile;
  const teamColor = player.nflTeam?.primaryColor ?? "#334155";

  return (
    <div>
      <Link href="/players" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to players
      </Link>

      <div
        className="mb-6 flex flex-col gap-4 rounded-xl border border-border p-5 sm:flex-row sm:items-center"
        style={{ background: `linear-gradient(135deg, ${teamColor}22, transparent)` }}
      >
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
          style={{ backgroundColor: teamColor }}
        >
          {player.firstName[0]}
          {player.lastName[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {player.firstName} {player.lastName}
            </h1>
            <PositionBadge position={player.position} />
            {player.isRookie ? <RookieBadge /> : null}
            {player.injuryStatus !== "HEALTHY" ? <InjuryBadge status={player.injuryStatus} /> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {player.nflTeam ? `${player.nflTeam.city} ${player.nflTeam.name}` : "Free Agent"}
            {player.jerseyNumber ? ` · #${player.jerseyNumber}` : ""}
            {player.playerSeason?.byeWeek ? ` · Bye Week ${player.playerSeason.byeWeek}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Ruler className="h-4 w-4" /> {formatHeight(player.heightInches)}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Weight className="h-4 w-4" /> {player.weightLbs ? `${player.weightLbs} lbs` : "-"}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <GraduationCap className="h-4 w-4" /> {player.college ?? "-"}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            {player.age ? `Age ${player.age}` : "-"} · {player.yearsExperience === 0 ? "Rookie" : `${player.yearsExperience} yrs exp`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Overall Rank" value={player.ranking ? `#${player.ranking.overallRank}` : "—"} subtext="Consensus" />
        <MetricCard label="Position Rank" value={player.ranking ? `${player.position}${player.ranking.positionRank}` : "—"} />
        <MetricCard
          label="ADP"
          value={player.adp ? player.adp.overallADP.toFixed(1) : "—"}
          subtext={player.adp?.adpDelta ? `${player.adp.adpDelta > 0 ? "+" : ""}${player.adp.adpDelta.toFixed(1)} vs prior` : undefined}
        />
        <MetricCard label="Tier" value={player.playerSeason?.tier?.label ?? "—"} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Projection ({league.scoringFormatPreset.replace("_", " ")})</CardTitle>
          </CardHeader>
          <CardContent>
            {proj ? (
              <>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                  {proj.games !== null ? <Stat label="Games" value={proj.games} /> : null}
                  {proj.passingYards !== null ? <Stat label="Pass Yds" value={proj.passingYards} /> : null}
                  {proj.passingTDs !== null ? <Stat label="Pass TD" value={proj.passingTDs} /> : null}
                  {proj.interceptions !== null ? <Stat label="INT" value={proj.interceptions} /> : null}
                  {proj.rushAttempts !== null ? <Stat label="Rush Att" value={proj.rushAttempts} /> : null}
                  {proj.rushingYards !== null ? <Stat label="Rush Yds" value={proj.rushingYards} /> : null}
                  {proj.rushingTDs !== null ? <Stat label="Rush TD" value={proj.rushingTDs} /> : null}
                  {proj.targets !== null ? <Stat label="Targets" value={proj.targets} /> : null}
                  {proj.receptions !== null ? <Stat label="Rec" value={proj.receptions} /> : null}
                  {proj.receivingYards !== null ? <Stat label="Rec Yds" value={proj.receivingYards} /> : null}
                  {proj.receivingTDs !== null ? <Stat label="Rec TD" value={proj.receivingTDs} /> : null}
                  {proj.fieldGoalsMade !== null ? <Stat label="FG Made" value={proj.fieldGoalsMade} /> : null}
                  {proj.extraPointsMade !== null ? <Stat label="XP Made" value={proj.extraPointsMade} /> : null}
                  {proj.fantasyPoints !== null ? <Stat label="Fantasy Pts" value={proj.fantasyPoints} highlight /> : null}
                </div>
                <Separator className="my-4" />
                <ProjectionChart floor={proj.floor} median={proj.median} ceiling={proj.ceiling} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No projection available for this player yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Trend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              {trendIcon(player.playerSeason?.trend)}
              <span className="capitalize">{player.playerSeason?.trend ?? "No trend data"}</span>
            </div>
            {player.playerSeason?.fantasyPointsRecent !== null && player.playerSeason?.fantasyPointsRecent !== undefined ? (
              <p className="text-sm text-muted-foreground">
                Recent fantasy points: <span className="font-semibold text-foreground">{player.playerSeason.fantasyPointsRecent.toFixed(1)}</span>
              </p>
            ) : null}
            {player.playerSeason?.draftRecommendation ? (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Draft Recommendation</p>
                  <p className="mt-1 text-sm">{player.playerSeason.draftRecommendation}</p>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scouting Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {hasScoutingNotes ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NoteList title="Strengths" items={player.playerSeason?.strengths ?? []} />
                <NoteList title="Weaknesses" items={player.playerSeason?.weaknesses ?? []} />
                <NoteList title="Risk Factors" items={player.playerSeason?.riskFactors ?? []} />
                {player.playerSeason?.teamSituation ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team Situation</p>
                    <p className="mt-1.5 text-sm">{player.playerSeason.teamSituation}</p>
                  </div>
                ) : null}
                {player.playerSeason?.depthChartCompetition ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Depth Chart Competition</p>
                    <p className="mt-1.5 text-sm">{player.playerSeason.depthChartCompetition}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No scouting notes are available yet for this player.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {player.isRookie && rp ? (
        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rookie Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {rp.draftRound ? `Round ${rp.draftRound}` : "UDFA"}
                  {rp.draftPick ? `, Pick ${rp.draftPick}` : ""}
                </Badge>
                {rp.rookieTier ? <Badge variant="outline">Tier {rp.rookieTier}</Badge> : null}
                {rp.overallFantasyRank ? <Badge variant="outline">Rookie Rank #{rp.overallFantasyRank}</Badge> : null}
                {rp.fantasyPositionRank ? (
                  <Badge variant="outline">
                    {player.position}
                    {rp.fantasyPositionRank} among rookies
                  </Badge>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                {rp.projectedGames !== null ? <Stat label="Proj Games" value={rp.projectedGames} /> : null}
                {rp.projectedAttempts !== null ? <Stat label="Proj Att" value={rp.projectedAttempts} /> : null}
                {rp.projectedRushingYards !== null ? <Stat label="Proj Rush Yds" value={rp.projectedRushingYards} /> : null}
                {rp.projectedTargets !== null ? <Stat label="Proj Targets" value={rp.projectedTargets} /> : null}
                {rp.projectedReceptions !== null ? <Stat label="Proj Rec" value={rp.projectedReceptions} /> : null}
                {rp.projectedReceivingYards !== null ? <Stat label="Proj Rec Yds" value={rp.projectedReceivingYards} /> : null}
                {rp.projectedTouchdowns !== null ? <Stat label="Proj TD" value={rp.projectedTouchdowns} /> : null}
                {rp.projectedFantasyPoints !== null ? <Stat label="Proj Fantasy Pts" value={rp.projectedFantasyPoints} highlight /> : null}
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rp.opportunityScore !== null ? <ValueIndicator score={rp.opportunityScore} label="Opportunity" /> : null}
                {rp.competitionScore !== null ? <ValueIndicator score={rp.competitionScore} label="Competition" /> : null}
                {rp.landingSpotScore !== null ? <ValueIndicator score={rp.landingSpotScore} label="Landing Spot" /> : null}
                {rp.breakoutScore !== null ? <ValueIndicator score={rp.breakoutScore} label="Breakout Potential" /> : null}
              </div>

              <ProjectionChart floor={rp.floor} median={rp.median} ceiling={rp.ceiling} />

              {rp.analystNotes ? (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Analyst Notes</p>
                    <p className="mt-1.5 text-sm">{rp.analystNotes}</p>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {comparablePlayers.length > 0 ? (
        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparable Players</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {comparablePlayers.map((cp) => (
                <Button key={cp.id} asChild variant="outline" size="sm">
                  <Link href={`/players/${cp.id}`} className="flex items-center gap-1.5">
                    <PositionBadge position={cp.position} />
                    {cp.firstName} {cp.lastName}
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums font-semibold ${highlight ? "text-primary" : ""}`}>
        {Number.isInteger(value) ? value : value.toFixed(1)}
      </span>
    </div>
  );
}
