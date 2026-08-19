import type { Position } from "@prisma/client";

export const POSITION_COLOR_CLASSES: Record<Position, string> = {
  QB: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  RB: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  WR: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  TE: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  K: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  DST: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

export const RISK_COLOR_CLASSES: Record<"LOW" | "MEDIUM" | "HIGH", string> = {
  LOW: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  MEDIUM: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  HIGH: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};
