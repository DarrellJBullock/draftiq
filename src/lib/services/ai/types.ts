export interface AIPlayerContext {
  id: string;
  name: string;
  position: string;
  team: string | null;
  overallRank: number;
  positionRank: number;
  adp: number;
  projectedPoints: number;
  tier: number | null;
  isRookie: boolean;
  injuryStatus: string;
  /** Estimated multiplier for the league's DDAFL distance-tiered scoring bonuses -- only present when that league has MFL sync configured. */
  ddaflAdjustment?: number;
}

export interface AIRequestContext {
  season: number;
  scoringFormat: string;
  leagueSize?: number;
  draftPosition?: number;
  rosterNeeds?: string[];
  /** Grounding data -- the ONLY source of truth the AI is allowed to cite stats from. */
  players: AIPlayerContext[];
}

export interface AIAnalysisRequest {
  question: string;
  context: AIRequestContext;
}

export interface AIAnalysisResponse {
  recommendation: string;
  reasoning: string;
  alternatives: string[];
  risk: string;
  confidence: number; // 0-1
  providerUsed: string;
}

export interface AIProvider {
  readonly name: string;
  analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;
}
