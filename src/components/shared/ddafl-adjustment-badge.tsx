/** Shows the estimated DDAFL distance-tiered-scoring adjustment as a signed percentage. See lib/services/scoring/ddafl-adjustment.ts. */
export function DdaflAdjustmentBadge({ adjustment }: { adjustment: number }) {
  const pct = Math.round((adjustment - 1) * 100);
  if (pct === 0) return <span className="text-muted-foreground">-</span>;
  return (
    <span className={pct > 0 ? "text-emerald-400" : "text-rose-400"}>
      {pct > 0 ? "+" : ""}
      {pct}%
    </span>
  );
}
