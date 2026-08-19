import { seedDataProvider } from "./seed-provider";
import type { NFLDataProvider } from "./types";

export type * from "./types";

/**
 * Provider factory. Today this always returns the seed/DB-backed provider;
 * wiring a live vendor means adding a new module implementing
 * `NFLDataProvider` and returning it here based on an env var, e.g.
 * `DATA_PROVIDER=sportsdataio`.
 */
export function getDataProvider(): NFLDataProvider {
  return seedDataProvider;
}
