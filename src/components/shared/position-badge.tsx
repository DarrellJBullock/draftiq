import type { Position } from "@prisma/client";
import { cn } from "@/lib/utils";
import { POSITION_COLOR_CLASSES } from "./position-colors";

export function PositionBadge({ position, className }: { position: Position; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-9 items-center justify-center rounded border px-1.5 text-[11px] font-bold tabular-nums",
        POSITION_COLOR_CLASSES[position],
        className
      )}
    >
      {position}
    </span>
  );
}
