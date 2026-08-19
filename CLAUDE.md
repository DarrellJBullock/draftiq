# DraftIQ — Claude Code Instructions

DraftIQ is a fantasy football draft preparation and draft-day assistant: player database, rookie system, rankings/tiers/ADP, a value engine, sleeper/bust finders, draft strategy recommendations, a mock draft simulator with CPU personalities, a live draft-day assistant, team builder, trade analyzer, and an AI assistant grounded in the app's own data.

This file documents how the codebase is put together so future work (by Claude or anyone else) stays consistent with it.

## Architecture

```
src/
  app/                     Next.js App Router routes + API route handlers (src/app/api/**)
  components/
    ui/                    shadcn/ui primitives (generated, edit sparingly)
    shell/                 App chrome: sidebar nav, navbar, AppShell layout
    shared/                Reusable feature components (PlayerCard, PositionBadge, RankingTable, ...)
  lib/
    db/                    Prisma client singleton
    auth/                  Local/demo auth (see "Auth" below)
    season.ts              Active-season resolution
    validation/            Zod schemas, one file per domain (player, league, draft, trade, ai, import, common)
    queries/                Data-access layer: Prisma reads/writes shaped for the UI and API routes
    services/               Framework-agnostic business logic ("engines") -- see below
    api-helpers.ts          Shared API route response/error helpers
  types/                    Cross-cutting TypeScript types
prisma/
  schema.prisma
  seed.ts                  Orchestrates seeding
  seed/                    Seed data generators (teams, players, rookies, stat lines, RNG, derived rankings/ADP/tiers)
data/templates/            CSV/JSON import templates
tests/unit/                Vitest unit tests for the engines
```

**Business logic lives in `src/lib/services/*`, never in components or route handlers.** Route handlers and Server Components are thin: parse input (Zod), call a query/service function, return/render the result. Each engine under `src/lib/services/` is a set of pure functions -- no Prisma calls inside an engine -- so it can be unit tested with plain objects (see `tests/unit/`).

- `value-engine` -- draft value scoring (`calculateValue`), weights in `value-engine/weights.ts`.
- `rookie-engine` -- rookie-specific scoring (opportunity/competition/landing-spot/breakout) and class ranking.
- `draft-engine` -- snake/linear pick order math, CPU personality drafting, mock-draft simulation, post-draft grading, recommendation helpers (best available/value/rookie/safe/upside, "who should I draft?").
- `strategy-engine` -- scores the 10 named draft strategies against a league's settings.
- `sleeper-bust` -- sleeper/bust scoring from ADP-vs-rank gaps and risk signals.
- `trade-engine` -- trade value comparison; `getRestOfSeasonProjection` is the seam for future weekly-projection data.
- `scoring` -- recomputes fantasy points from raw stats under an arbitrary (including fully custom) league scoring config.
- `providers` -- `NFLDataProvider` interface, the default `seedDataProvider` (reads whatever is currently in Postgres), and `sleeperProvider` (real, free, no-key live NFL rosters from api.sleeper.app -- player bios/status only, no ADP/rankings/projections). `sync.ts` upserts a live provider's `getPlayers()` output into the DB with `dataSource: "PROVIDER"`, triggered from `/import`'s "Live Data Sync" panel or `POST /api/sync/players`.
- `ai` -- `AIProvider` interface with OpenAI/Anthropic implementations (via the Vercel AI SDK's `generateObject`) and a deterministic, zero-cost fallback used whenever no API key is configured.

`src/lib/queries/*` sits between the engines and the UI: it fetches from Prisma, shapes the result (see `queries/shape.ts`), and often calls an engine to attach computed fields (e.g. `queries/value-pool.ts` attaches `ValueResult` to every player).

## Coding conventions

- Server Components by default. Add `"use client"` only where you need hooks, browser APIs, or event handlers.
- Tailwind **v3** (classic `@tailwind` directives + `tailwind.config.ts`, not v4). Theme colors are CSS variables defined in `src/app/globals.css` (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `bg-primary`, etc.) -- use those, not hardcoded hex values, so the design stays consistent. Dark mode is the only theme (the `<html>` element always carries `class="dark"`).
- Use `cn()` from `@/lib/utils` for conditional classes, `lucide-react` for icons, Recharts for charts.
- **Cross-position "value" comparisons exclude K/DST** (`SKILL_POSITIONS.includes(position)` from `@/types`). The value engine's normalization is misleading for those tight-point-range positions; K/DST still belong in the main player database and get their own draft-slot treatment, just not "best value" leaderboards.
- Zod schemas for all external input (API route bodies/query params, CSV/JSON import rows) live in `src/lib/validation/`.

## Database conventions

- Prisma 6, PostgreSQL. `DATABASE_URL` in `.env` (see `env.example`); local dev has a non-secret fallback wired into `next.config.ts` so `npm run dev` works with zero setup.
- `Season` scopes everything year-specific (`PlayerSeason`, `ADP`, `Projection`, `Ranking`, `Tier`, `Draft`, ...). `Player` holds season-independent bio data; `PlayerSeason` is the per-season extension point. This is what lets the app add a new season without a schema change (see "How to add a new season" below).
- Every model that can come from either seed data or a real import/provider carries a `dataSource: SEED | PROVIDER | USER` field -- always set it correctly when writing new rows.
- `Ranking` / `ADP` / `Projection` are keyed on `(seasonId, playerId, scoringFormat[, source])` -- one row per format, not one row with a "current format" flag, so switching formats in the UI never requires recomputation.
- Ratings/scores are 0-100 floats (rookie opportunity/competition/landing-spot/breakout scores, value-engine outputs).
- Run `npm run db:push` after any schema change (no migration history is tracked yet -- this project uses `db push`, not `migrate`).

## API conventions

- Route handlers under `src/app/api/**`; each parses input with a Zod schema from `src/lib/validation/`, delegates to `src/lib/queries/` (which may call into `src/lib/services/`), and returns via `withValidation()` from `src/lib/api-helpers.ts` for consistent error shapes.
- GET routes take query params; POST routes take a JSON body.
- Server Components fetch data directly from `src/lib/queries/*` (no self-fetching the API from a Server Component) -- API routes exist for client-side interactions (mock draft simulate, draft-day picks, trade analysis, AI chat, CSV import) and external consumption.

## Testing

- Vitest, tests in `tests/unit/`. Engines are pure functions, so tests construct plain input objects -- no test database needed for engine tests.
- Priority coverage (per the areas most likely to have a subtle bug): snake/linear pick-order math, value-engine weighting and position scarcity, league scoring-settings math, rookie class ranking, draft simulation + grading, sleeper/bust scoring, strategy fit scoring, trade evaluation.
- Run with `npm run test`.

## How to add a new fantasy scoring format

1. Add the value to the `ScoringFormatPreset` enum in `prisma/schema.prisma`, `npm run db:push`.
2. Add a label in `SCORING_FORMAT_LABELS` (`src/types/index.ts`).
3. If it needs unique point values (like TE Premium's bonus), extend `LeagueSettings` in the schema and `leagueSettingsSchema` in `src/lib/validation/league.ts`.
4. `src/lib/services/scoring/calculateFantasyPoints` already takes an arbitrary `ScoringSettings` object, so custom-format math needs no engine changes -- only wire the new preset's defaults wherever presets are mapped to settings (`src/lib/queries/leagues.ts`).
5. Re-run `prisma/seed.ts` (or a `data/templates` CSV/JSON import) to populate `Ranking`/`ADP`/`Projection` rows for the new format -- they're keyed per-format, so old formats are untouched.

## How to add a new data provider

`sleeper-provider.ts` is a real, working reference implementation (free, no API key, live at api.sleeper.app) -- follow its shape for a new one.

1. Implement the `NFLDataProvider` interface (`src/lib/services/providers/types.ts`) in a new file, e.g. `providers/acme-provider.ts`. Map the vendor's response onto `ProviderPlayerRecord`/`ProviderADPRecord`/etc.; export the mapping function so it's unit-testable against a captured fixture (see `tests/unit/sleeper-provider.test.ts`) without hitting the network in CI.
2. Register it in the `PROVIDERS` map in `providers/index.ts` (also gate any required API key there, e.g. only register/use it when `ACME_API_KEY` is set).
3. `syncPlayersFromProvider()` (`providers/sync.ts`) already handles the `getPlayers()` sync path against any registered provider -- it upserts into `Player`/`PlayerSeason` with `dataSource: "PROVIDER"`, matching by `Player.externalId` first (reliable across re-syncs) and falling back to a name+position match. Wire ADP/Projections/Rankings similarly if the new vendor provides them (Sleeper doesn't -- those methods return `[]`).
4. The `/import` page's "Live Data Sync" panel and `POST /api/sync/players` already call `syncPlayersFromProvider()` by provider name -- a new provider just needs to appear in `AVAILABLE_PROVIDER_NAMES` (automatic once registered in step 2) to show up there.
5. Nothing else in the app needs to change -- all reads go through `src/lib/queries/*`, which don't care where the underlying rows came from.

## How to add a new rookie class

1. Add a new `Season` row (or reuse the current one) and a new draft-year cohort by giving each new rookie `Player` row `isRookie: true` plus a `RookieProfile` with `draftYear` set to the new class's year.
2. Bulk-load via the `/import` page (type "Rookie Data", template at `data/templates/rookies.csv`) or extend `prisma/seed/rookies.ts`'s generator for demo purposes.
3. Rookie ranking/tiering is recomputed from whatever `RookieProfile` rows exist for the season being viewed (`src/lib/queries/rookie-watch.ts`, `src/lib/services/rookie-engine`) -- there's no hardcoded "current class," so last year's rookies simply age out of `isRookie` filtering once their `Player.isRookie` flag is flipped to `false` (or a new season makes them a veteran in the UI's eyes via `yearsExperience`).

## How to add new AI capabilities

1. New question types: the deterministic fallback (`src/lib/services/ai/deterministic-provider.ts`) pattern-matches on keywords in the question and answers strictly from `context.players` -- add a new `if (lower.includes(...))` branch there for reliable, zero-cost coverage of a new question shape.
2. New grounding data: extend `AIRequestContext`/`AIPlayerContext` (`src/lib/services/ai/types.ts`) and `buildAIContext` (`src/lib/queries/ai-context.ts`) -- e.g. to ground trade or roster-specific questions, pass the user's current roster into context.
3. New LLM-backed behavior: the system prompt in `src/lib/services/ai/prompt.ts` is the single place enforcing "only use facts from context, never invent stats" -- keep new capabilities inside that constraint rather than loosening it.
4. Never import anything under `src/lib/services/ai/` into a Client Component -- these files are server-only (guarded by the `server-only` package) because API keys must never reach the browser.

## Auth

Local/demo auth only, behind an `AuthProvider` interface (`src/lib/auth/types.ts`) so Clerk/Auth.js can be swapped in later without touching call sites. `getCurrentUserOrDemo()` is read-only and safe in Server Components (falls back to the seeded demo user without writing a cookie, since Next.js forbids cookie writes during rendering); `requireUser()` writes the signed session cookie and may only be called from a Server Action or Route Handler.
