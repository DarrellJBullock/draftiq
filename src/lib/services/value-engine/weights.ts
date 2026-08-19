export interface ValueWeights {
  projection: number;
  adpValue: number;
  scarcity: number;
  need: number;
  tierDropoff: number;
  risk: number;
  byeConflict: number;
}

/**
 * The formula abstraction: every weight lives here so the scoring model can
 * be re-tuned (or A/B tested) without touching `calculateValue` itself.
 */
export const DEFAULT_VALUE_WEIGHTS: ValueWeights = {
  projection: 35,
  adpValue: 20,
  scarcity: 15,
  need: 15,
  tierDropoff: 8,
  risk: -5,
  byeConflict: -3,
};
