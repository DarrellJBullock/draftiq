import Link from "next/link";
import type { Position } from "@prisma/client";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import { getActiveSeason } from "@/lib/season";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getOrCreateDefaultLeague } from "@/lib/queries/leagues";
import { getPlayerPool } from "@/lib/queries/players";
import { getValuedPlayerPool } from "@/lib/queries/value-pool";
import { getNFLTeams } from "@/lib/queries/teams";
import { playerQuerySchema } from "@/lib/validation/player";
import { computePositionAverageYPT } from "@/lib/services/scoring/ddafl-adjustment";
import { POSITIONS } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { PlayerSearch } from "@/components/shared/player-search";
import { PlayerTable } from "@/components/shared/player-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const query = playerQuerySchema.parse(rawParams);

  const [season, user, teams] = await Promise.all([getActiveSeason(), getCurrentUserOrDemo(), getNFLTeams()]);
  const league = await getOrCreateDefaultLeague(user.id);

  const { players, total, page, pageSize } = await getPlayerPool(season.id, {
    ...query,
    scoringFormat: query.scoringFormat ?? league.scoringFormatPreset,
  });

  const showDdaflAdjustment = !!league.mflLeagueId;
  const positionAverageYPT: Partial<Record<Position, number | null>> = {};
  if (showDdaflAdjustment) {
    const pool = await getValuedPlayerPool(season.id, query.scoringFormat ?? league.scoringFormatPreset);
    const inputs = pool.map((p) => ({
      position: p.position,
      rushAttempts: p.projection?.rushAttempts,
      rushingYards: p.projection?.rushingYards,
      receptions: p.projection?.receptions,
      receivingYards: p.projection?.receivingYards,
      attempts: p.projection?.attempts,
      passingYards: p.projection?.passingYards,
    }));
    for (const pos of POSITIONS) positionAverageYPT[pos] = computePositionAverageYPT(inputs, pos);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams(
      Object.entries(rawParams).flatMap(([k, v]) => (v === undefined ? [] : [[k, Array.isArray(v) ? v[0] : v]]))
    );
    params.set("page", String(targetPage));
    return `/players?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Player Database"
        description={`${season.label} · ${total} player${total === 1 ? "" : "s"} matching your filters`}
      />

      <PlayerSearch teams={teams} />

      {showDdaflAdjustment ? (
        <p className="mb-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">DDAFL Est.</span> is an estimated adjustment for your league&apos;s
          distance-tiered scoring bonuses, based on yards-per-touch efficiency -- not an exact calculation, since real
          per-play distance data isn&apos;t available from season projections.
        </p>
      ) : null}

      {players.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No players match those filters"
          description="Try widening your filters or clearing the search box."
        />
      ) : (
        <>
          <PlayerTable players={players} showDdaflAdjustment={showDdaflAdjustment} positionAverageYPT={positionAverageYPT} />

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} &middot; showing {players.length} of {total}
            </p>
            <div className="flex items-center gap-2">
              {page <= 1 ? (
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Prev
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm">
                  <Link href={buildPageHref(page - 1)}>
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Prev
                  </Link>
                </Button>
              )}
              {page >= totalPages ? (
                <Button variant="outline" size="sm" disabled>
                  Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm">
                  <Link href={buildPageHref(page + 1)}>
                    Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
