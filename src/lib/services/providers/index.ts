import { seedDataProvider } from "./seed-provider";
import { sleeperProvider } from "./sleeper-provider";
import type { NFLDataProvider } from "./types";

export type * from "./types";

const PROVIDERS: Record<string, NFLDataProvider> = {
  seed: seedDataProvider,
  sleeper: sleeperProvider,
};

export const AVAILABLE_PROVIDER_NAMES = Object.keys(PROVIDERS);

/** Looks up a provider by name (e.g. for a user-triggered sync), independent of the env-var default. */
export function getDataProviderByName(name: string): NFLDataProvider {
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Unknown data provider "${name}". Available: ${AVAILABLE_PROVIDER_NAMES.join(", ")}`);
  return provider;
}

/**
 * Provider factory used for normal app reads. Defaults to the seed/DB-backed
 * provider; set `DATA_PROVIDER=sleeper` to prefer a live vendor. Adding a new
 * vendor means implementing `NFLDataProvider` in a new module and registering
 * it in `PROVIDERS` above -- no other app code needs to change.
 */
export function getDataProvider(): NFLDataProvider {
  return getDataProviderByName(process.env.DATA_PROVIDER || "seed");
}
