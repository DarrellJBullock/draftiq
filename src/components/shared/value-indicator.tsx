import { cn } from "@/lib/utils";

function toneFor(score: number) {
  if (score >= 70) return "text-emerald-400";
  if (score >= 45) return "text-amber-400";
  return "text-rose-400";
}

export function ValueIndicator({ score, label, className }: { score: number; label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", score >= 70 ? "bg-emerald-500" : score >= 45 ? "bg-amber-500" : "bg-rose-500")}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className={cn("text-xs font-semibold tabular-nums", toneFor(score))}>{score.toFixed(0)}</span>
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
    </div>
  );
}
