import type { InjuryStatus, RiskLevel } from "@prisma/client";

/** Derives a risk level when one hasn't been explicitly set on a PlayerSeason. */
export function deriveRiskLevel(input: { injuryStatus: InjuryStatus; isRookie: boolean; age: number | null }): RiskLevel {
  if (["OUT", "IR", "PUP", "SUSPENDED"].includes(input.injuryStatus)) return "HIGH";
  if (input.injuryStatus === "DOUBTFUL") return "HIGH";
  if (input.injuryStatus === "QUESTIONABLE") return "MEDIUM";
  if (input.isRookie) return "MEDIUM";
  if (input.age && input.age >= 31) return "MEDIUM";
  return "LOW";
}
