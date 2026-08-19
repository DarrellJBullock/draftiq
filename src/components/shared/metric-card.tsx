import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  accent = "text-primary",
  className,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon?: LucideIcon;
  accent?: string;
  className?: string;
}) {
  return (
    <Card className={cn("border-border/70", className)}>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-bold tabular-nums">{value}</p>
          {subtext ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtext}</p> : null}
        </div>
        {Icon ? (
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted", accent)}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
