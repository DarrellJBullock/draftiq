# DraftIQ

A fantasy football draft preparation and draft-day assistant: a searchable player database with first-class rookie coverage, consensus/expert rankings, position tiers, an ADP dashboard, a configurable value engine, sleeper and bust finders, league-aware draft strategy recommendations, a mock draft simulator with ten distinct CPU personalities, a live draft-day assistant, a manual team builder, a trade analyzer, and an AI assistant grounded strictly in the app's own data.

## Overview

DraftIQ is built as a complete, working product rather than a prototype: a real Postgres/Prisma schema, a generated-but-internally-consistent 2026 season dataset (32 real NFL teams, ~480 players, and a 50-player rookie class), and every major feature wired end to end -- rankings, tiers, ADP, sleepers/busts, strategy, mock drafts, a live draft tracker, team building, trade analysis, and an AI assistant that falls back to deterministic, grounded answers when no LLM key is configured.

## Features

- **Player database** -- search and filter by position, team, rookie/veteran/free-agent status, ADP range, ranking, tier, age, bye week, injury status, and risk level.
- **Rookie system** -- a dedicated `RookieProfile` model (draft capital, opportunity/competition/landing-spot/breakout scores, floor/median/ceiling) and a Rookie Watch dashboard (top rookies, risers/fallers, best landing spots, best values, sleepers, red flags, breakout candidates).
- **Rankings & Tiers** -- consensus and expert rankings per scoring format, position-based tiers (Tier 1-8 per position).
- **ADP dashboard** -- overall/position ADP, movement, and an ADP-vs-ranking comparison to flag reaches and steals.
- **Value engine** -- a configurable, swappable-weights formula combining projection, positional scarcity, ADP, roster need, tier drop-off, floor/ceiling, risk, and bye-week conflicts.
- **Sleeper & Bust finders** -- scored from ADP-vs-rank gaps, opportunity, age, injury status, and trend.
- **Draft Strategy** -- scores all ten named strategies (Zero RB, Hero RB, Robust RB, Zero WR, Hero WR, Late/Early QB, Elite/Late TE, Balanced) against your league's settings and draft slot, with reasoning.
- **Mock Draft simulator** -- snake or linear, 4-20 teams, ten CPU drafting personalities, full post-draft grading (letter grade, positional grades, value gained, reach penalty, best/worst picks, roster construction feedback).
- **Draft Day assistant** -- manual live-pick tracking, best-available/best-value/sleeper/rookie/safe/upside quick filters, and a "Who Should I Draft?" comparison tool.
- **Team Builder** -- manually build and grade a roster against your league's starting requirements.
- **Trade Analyzer** -- multi-player trade evaluation with a value-based grade and winner call.
- **AI Assistant** -- ask free-form questions; answers are always grounded in the app's own player/ranking/ADP/projection data (OpenAI/Anthropic via the AI SDK when configured, otherwise a deterministic rule-based fallback -- never invented stats either way).
- **CSV/JSON import** -- validated bulk import for players, rookies, rankings, ADP, projections, and NFL teams, with per-row error/warning reporting (`/import`, templates in `data/templates/`).

## Tech stack

Next.js 16 (App Router) &middot; React 19 &middot; TypeScript &middot; Tailwind CSS v3 &middot; shadcn/ui &middot; Recharts &middot; Lucide icons &middot; PostgreSQL &middot; Prisma 6 &middot; Zod &middot; Vitest &middot; the Vercel AI SDK (OpenAI/Anthropic, with a deterministic fallback).

## Local setup

Prerequisites: Node 20+, a local PostgreSQL server.

```bash
npm install
createdb draftiq          # or point DATABASE_URL at an existing database
cp env.example .env       # then edit DATABASE_URL if needed
npm run db:push
npm run db:seed
npm run dev
```

The app is fully usable immediately after seeding -- no sign-up step (see "Auth" below) and no AI key required (the assistant runs in deterministic fallback mode).

> Note: this repo ships `env.example` (no leading dot) instead of `.env.example` -- rename it locally (`mv env.example .env.example`) if you want the conventional filename; either way, copy it to `.env` to configure your own environment. `next.config.ts` also fills in safe, non-secret local-dev defaults (a trust-auth local Postgres URL with no password) so `npm run dev` works even before you create a `.env`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `NEXT_PUBLIC_APP_URL` | Base URL of the app |
| `NEXT_PUBLIC_DEFAULT_SEASON` | Default season year shown before any `Season` row is queried |
| `DEMO_AUTH_SECRET` | HMAC secret signing the demo-mode session cookie |
| `AI_PROVIDER` | `openai` \| `anthropic` \| `fallback` (default) |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Only needed if `AI_PROVIDER` is set to that provider. Server-side only, never sent to the browser. |
| `AI_MODEL` | Optional model override |

## Database setup & seeding

```bash
npm run db:push     # sync prisma/schema.prisma to your database (no migration history yet)
npm run db:seed     # generate the 2026 season: 32 NFL teams, ~480 players, a 50-player rookie class,
                     # plus rankings/ADP/projections/tiers for Standard, Half PPR, and PPR
npm run db:studio   # optional: browse the data with Prisma Studio
```

Seed data is generated (not hand-authored real rosters) because this build's knowledge horizon predates verified 2026 season roster/draft results -- player identities are clearly demo data (`dataSource: "SEED"`), while team names/structure/scoring math are real and accurate. Swap in real data at any time via the CSV/JSON import at `/import`, or by implementing a live `NFLDataProvider` (see `CLAUDE.md`).

## Uploading player/ranking/ADP/projection/team data

Visit `/import`, choose a data type, pick a season year, and upload a CSV or JSON file (templates and examples are in `data/templates/`). "Validate" previews rows and reports errors/warnings without writing anything; "Confirm Import" commits.

## How the value engine works

`calculateValue()` (`src/lib/services/value-engine`) combines value-over-replacement projection, ADP-vs-rank market value, positional scarcity, roster need, tier drop-off, risk, and bye-week conflicts into `overallValue`, `positionValue`, `draftValue`, `riskAdjustedValue`, and `upsideScore` (all 0-100). Weights live in `value-engine/weights.ts` and are swappable without touching the formula itself.

## How the draft simulator works

`simulateFullDraft()` (`src/lib/services/draft-engine`) computes the full snake/linear pick order, then has each team (CPU or user) score the remaining player pool according to its personality (BPA, Zero RB, Hero RB, Zero WR, Early/Late QB, Elite TE, Rookie-Heavy, ADP-Focused, Sleeper-Focused) plus roster-need pressure, and weighted-randomly selects among the top candidates. `gradeDraft()` then scores the user's picks against ADP to produce a letter grade, positional grades, and best/worst-pick call-outs.

## Data model

See `prisma/schema.prisma`. Key models: `User`, `League`/`LeagueSettings`, `Season`, `NFLTeam`, `Player`/`PlayerSeason`, `RookieProfile`, `Ranking`, `Projection`, `ADP`, `Tier`, `Draft`/`DraftPick`, `Roster`/`RosterPlayer`, `MockDraft`, `Trade`, `SavedPlayer`, `UserRanking`/`UserTier`, `AIConversation`. `Season` scopes everything year-specific so adding a future season never requires a schema change.

## App routes

`/` `/players` `/players/[id]` `/rookies` `/rankings` `/tiers` `/draft-strategy` `/mock-draft` `/mock-draft/[id]` `/draft-day` `/adp` `/sleepers` `/busts` `/team-builder` `/trade-analyzer` `/ai-assistant` `/settings` `/import`

## Development commands

```bash
npm run dev         # start the dev server (Turbopack)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest unit tests
npm run build         # production build
npm run start         # run the production build
```

## Production build

```bash
npm run build
npm run start
```

Set real `DATABASE_URL`, `DEMO_AUTH_SECRET`, and (optionally) `AI_PROVIDER` + provider API key as platform environment variables before deploying -- see `env.example`.

## Legal note

NFL team names, cities, conferences, and divisions are real, publicly known facts (no logos or copyrighted creative assets are used or included). Individual player identities in the seeded dataset are generated demo data, not real people -- see "Database setup & seeding" above for why, and the CSV/JSON import system for bringing in your own licensed real-player data.

## Resume bullet

Built a fantasy football draft preparation platform using Next.js, React, TypeScript, PostgreSQL, Prisma, a configurable draft value engine, a rookie scoring model, a CPU-personality mock draft simulator with automated grading, a live draft-day assistant, trade analysis, CSV/JSON data import, and an AI assistant grounded in application data with a deterministic zero-key fallback.

## Future roadmap

- Auction draft mode (the `DraftMode` enum and settings UI already account for it; the simulator itself only implements snake/linear today).
- Weekly (in-season) projections, wired through the `getRestOfSeasonProjection` seam already in the trade engine.
- A real external data provider behind the existing `NFLDataProvider` interface.
- Multi-user leagues with real invites/turns for Draft Day, on top of the existing Clerk/Auth.js-ready auth abstraction.
