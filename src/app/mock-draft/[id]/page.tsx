import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { getMockDraftResult } from "@/lib/queries/drafts";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { PositionBadge } from "@/components/shared/position-badge";
import { RookieBadge } from "@/components/shared/rookie-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Position } from "@/types";
import type { PickNote } from "@/lib/services/draft-engine";

export default async function MockDraftResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mockDraft = await getMockDraftResult(id);
  if (!mockDraft) notFound();

  const positionalGrades = mockDraft.positionalGrades as unknown as Partial<Record<Position, string>>;
  const bestPicks = mockDraft.bestPicks as unknown as PickNote[];
  const worstPicks = mockDraft.worstPicks as unknown as PickNote[];

  return (
    <div>
      <Link href="/mock-draft" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to mock drafts
      </Link>
      <PageHeader
        title="Mock Draft Result"
        description={`${mockDraft.teamCount}-team, pick ${mockDraft.draftPosition} · ${mockDraft.scoringFormat.replace("_", " ")} · ${mockDraft.rounds} rounds`}
        actions={<Badge className="text-lg px-3 py-1">{mockDraft.overallGrade}</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Grade Score" value={`${mockDraft.gradeScore}/100`} />
        <MetricCard label="Value Gained" value={`+${mockDraft.valueGained}`} accent="text-emerald-400" />
        <MetricCard label="Reach Penalty" value={`-${mockDraft.reachPenalty}`} accent="text-rose-400" />
        <MetricCard label="Strategy" value={mockDraft.strategyUsed?.replaceAll("_", " ") ?? "Best Available"} />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Positional grades</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(positionalGrades).map(([position, grade]) => (
            <div key={position} className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5">
              <PositionBadge position={position as Position} />
              <span className="text-sm font-bold">{grade}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Best picks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bestPicks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No standout value picks this draft.</p>
            ) : (
              bestPicks.map((p) => (
                <div key={p.playerId} className="rounded-md bg-emerald-500/10 p-2 text-sm">
                  <p className="font-medium">
                    Round {p.round}: {p.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.note}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <TrendingDown className="h-4 w-4 text-rose-400" /> Worst picks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {worstPicks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No significant reaches this draft.</p>
            ) : (
              worstPicks.map((p) => (
                <div key={p.playerId} className="rounded-md bg-rose-500/10 p-2 text-sm">
                  <p className="font-medium">
                    Round {p.round}: {p.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.note}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {mockDraft.strengths.map((s, i) => (
                <li key={i}>&bull; {s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Weaknesses</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {mockDraft.weaknesses.map((s, i) => (
                <li key={i}>&bull; {s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recommended improvements</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {mockDraft.recommendedImprovements.map((s, i) => (
                <li key={i}>&bull; {s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Full draft board</h2>
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">Rd.Pick</TableHead>
                <TableHead className="w-16">Team</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="w-16">Pos</TableHead>
                <TableHead className="text-right">ADP</TableHead>
                <TableHead className="text-right">Reach</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockDraft.draft.picks.map((pick) => (
                <TableRow key={pick.id} className={cn(pick.isUserPick && "bg-primary/10", pick.isKeeper && "opacity-80")}>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {pick.isKeeper ? (
                      <Badge variant="outline" className="text-[10px]">
                        KEEPER
                      </Badge>
                    ) : (
                      `${pick.round}.${String(pick.pickInRound).padStart(2, "0")}`
                    )}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {pick.isUserPick ? <Badge className="text-[10px]">YOU</Badge> : `Team ${pick.teamSlot}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">
                        {pick.player ? `${pick.player.firstName} ${pick.player.lastName}` : "Unknown"}
                      </span>
                      {pick.player?.isRookie ? <RookieBadge /> : null}
                    </div>
                  </TableCell>
                  <TableCell>{pick.player ? <PositionBadge position={pick.player.position} /> : null}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{pick.isKeeper ? "-" : pick.adpAtPick?.toFixed(1) ?? "-"}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", pick.reachAmount && pick.reachAmount > 5 ? "text-rose-400" : "text-muted-foreground")}>
                    {pick.isKeeper ? "-" : pick.reachAmount ? `+${pick.reachAmount.toFixed(1)}` : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <Button asChild variant="outline">
          <Link href="/mock-draft">Run another mock draft</Link>
        </Button>
      </div>
    </div>
  );
}
