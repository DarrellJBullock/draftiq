import type { Position } from "@prisma/client";

/**
 * DDAFL (a real MFL league) pays a distance-tiered bonus -- longer touchdowns
 * and big gains are worth more points than short ones. We don't have
 * per-play distance data (season projections only give totals), so this
 * approximates it with the closest available proxy: yards-per-touch.
 * A player who gains more per touch is statistically more likely to produce
 * the long plays DDAFL rewards, even at identical season totals to a
 * lower-efficiency teammate. This is an estimate, not an exact replica.
 */
export interface DdaflAdjustmentInput {
  position: Position;
  rushAttempts?: number | null;
  rushingYards?: number | null;
  receptions?: number | null;
  receivingYards?: number | null;
  attempts?: number | null;
  passingYards?: number | null;
}

// Below this many touches, yards-per-touch is too noisy to trust (a backup's
// one 60-yard catch on 3 targets isn't a real efficiency signal).
const MIN_TOUCHES: Partial<Record<Position, number>> = { RB: 20, WR: 10, TE: 8, QB: 50 };

// Calibrated against DDAFL's real tier breakpoints (roughly a +3pt bonus for
// an 80+ yard gain, escalating TD points by distance) so the adjustment's
// range is in the right ballpark, not exact -- a genuinely explosive player
// tops out around +12%, a low-efficiency compiler bottoms out around -8%.
const MAX_DELTA_UP = 0.4;
const MAX_DELTA_DOWN = 0.27;
const ADJUSTMENT_SCALE = 0.3;

/** Yards per touch for whichever touch type is primary at this position, or null if the sample is too small. */
export function yardsPerTouch(p: DdaflAdjustmentInput): number | null {
  switch (p.position) {
    case "RB": {
      const touches = p.rushAttempts ?? 0;
      if (touches < MIN_TOUCHES.RB!) return null;
      return (p.rushingYards ?? 0) / touches;
    }
    case "WR":
    case "TE": {
      const touches = p.receptions ?? 0;
      const min = p.position === "WR" ? MIN_TOUCHES.WR! : MIN_TOUCHES.TE!;
      if (touches < min) return null;
      return (p.receivingYards ?? 0) / touches;
    }
    case "QB": {
      const touches = p.attempts ?? 0;
      if (touches < MIN_TOUCHES.QB!) return null;
      return (p.passingYards ?? 0) / touches;
    }
    default:
      return null;
  }
}

/** Average yards-per-touch across a position group, ignoring anyone below the sample-size floor. */
export function computePositionAverageYPT(players: DdaflAdjustmentInput[], position: Position): number | null {
  const values = players
    .filter((p) => p.position === position)
    .map(yardsPerTouch)
    .filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Bounded multiplier (roughly 0.92-1.12) to apply on top of a player's standard PPR value/points. Returns 1 (no change) for K/DST or too-small samples. */
export function calculateDdaflAdjustment(p: DdaflAdjustmentInput, positionAverageYPT: number | null): number {
  const ypt = yardsPerTouch(p);
  if (ypt === null || !positionAverageYPT) return 1;
  const delta = Math.max(-MAX_DELTA_DOWN, Math.min(MAX_DELTA_UP, ypt / positionAverageYPT - 1));
  return 1 + delta * ADJUSTMENT_SCALE;
}
