export interface StatLine {
  passingYards?: number | null;
  passingTDs?: number | null;
  interceptions?: number | null;
  rushingYards?: number | null;
  rushingTDs?: number | null;
  receivingYards?: number | null;
  receivingTDs?: number | null;
  receptions?: number | null;
  fieldGoalsMade?: number | null;
  extraPointsMade?: number | null;
}

export interface ScoringSettings {
  passingTDPoints: number;
  passingYardPoints: number;
  interceptionPoints: number;
  rushingTDPoints: number;
  rushingYardPoints: number;
  receivingTDPoints: number;
  receivingYardPoints: number;
  receptionPoints: number;
  tePremiumBonus?: number;
}

/** Computes fantasy points for a statline under an arbitrary (user-customized) league scoring config. */
export function calculateFantasyPoints(stat: StatLine, settings: ScoringSettings, isTightEnd = false): number {
  let points = 0;
  points += (stat.passingYards ?? 0) * settings.passingYardPoints;
  points += (stat.passingTDs ?? 0) * settings.passingTDPoints;
  points += (stat.interceptions ?? 0) * settings.interceptionPoints;
  points += (stat.rushingYards ?? 0) * settings.rushingYardPoints;
  points += (stat.rushingTDs ?? 0) * settings.rushingTDPoints;
  points += (stat.receivingYards ?? 0) * settings.receivingYardPoints;
  points += (stat.receivingTDs ?? 0) * settings.receivingTDPoints;
  points += (stat.receptions ?? 0) * (settings.receptionPoints + (isTightEnd ? settings.tePremiumBonus ?? 0 : 0));
  points += (stat.fieldGoalsMade ?? 0) * 3;
  points += (stat.extraPointsMade ?? 0) * 1;
  return Math.round(points * 10) / 10;
}

export const STANDARD_SCORING: ScoringSettings = {
  passingTDPoints: 4,
  passingYardPoints: 0.04,
  interceptionPoints: -2,
  rushingTDPoints: 6,
  rushingYardPoints: 0.1,
  receivingTDPoints: 6,
  receivingYardPoints: 0.1,
  receptionPoints: 0,
};

export const HALF_PPR_SCORING: ScoringSettings = { ...STANDARD_SCORING, receptionPoints: 0.5 };
export const PPR_SCORING: ScoringSettings = { ...STANDARD_SCORING, receptionPoints: 1 };
