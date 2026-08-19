import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function RookieBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded border border-primary/30 bg-primary/10 px-1.5 text-[11px] font-semibold text-primary",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      ROOKIE
    </span>
  );
}
