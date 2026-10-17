# Architecture

```
 Phone / browser                                     Server
┌───────────────┐   HTTPS (JSON)   ┌──────────────────────────────────────────┐
│ apps/web      │ ───────────────▶ │ apps/api  (Fastify)                       │
│ apps/mobile   │ ◀─────────────── │  modules/trips · members · plans · votes │
└───────┬───────┘                  │  modules/ai ──▶ OpenAI (Structured Output)│
        │ uses                     │  Prisma ──▶ SQLite (dev) / Postgres (prod)│
        ▼                          └──────────────────────────────────────────┘
 packages/shared  ◀───────────── uses ───────────────┘
 (types, Zod schemas, overlap & cost maths, booking links, API client)
```

## Why this stack

- **TypeScript everywhere.** The website, API and mobile app share one package of types, validation and business logic (`packages/shared`). A field added to a plan is added once.
- **Fastify** — small, fast, no framework magic. Each feature is a folder in `apps/api/src/modules/` with its own `routes.ts` (and `service.ts` when there is logic).
- **Prisma** — readable schema, migrations, works with SQLite locally (zero setup) and PostgreSQL in production.
- **Zod** — the same schema validates request bodies and the AI's output.
- **OpenAI Structured Outputs** — the model must return JSON matching `AiPlanSchema`, so no fragile text parsing.

## Backend modules (`apps/api/src`)

| Folder | Responsibility |
|---|---|
| `config/env.ts` | Reads and validates environment variables once |
| `lib/` | Database client, auth (member tokens), errors, id generation |
| `modules/trips` | Create trip, read trip view, lock; `view.ts` builds what a member sees |
| `modules/members` | Invite preview, join, save preferences |
| `modules/plans` | Background generation jobs, choosing stay/transport |
| `modules/votes` | 👍/👎 and swaps |
| `modules/ai` | Planner interface; `openai/` (prompt + client), `mock/` (offline sample data), `enrich.ts` (ids, dates, booking links) |
| `modules/demo` | Demo-only: seeded friends, auto-votes, sample trip, token switching |

## Data model

`Trip` 1─* `Member` (token, preferences JSON) · `Trip` 1─* `Plan` (versioned; full plan document JSON; chosen stay/transport) · `Plan` 1─* `Vote`, `Swap` · `Trip` 1─* `GenerationJob` (status + stage for progress UI).

Plans are stored as one JSON document (`PlanDocument` in `packages/shared/src/types.ts`) because they are always read and written whole; votes and swaps are rows so concurrent members don't overwrite each other.

## Identity without sign-up

Creating or joining a trip returns a random 32-character **member token**. Clients send it as `Authorization: Bearer <token>`. The website keeps tokens in `localStorage`; the mobile app keeps them in the device keychain (SecureStore). Organizer-only actions (generate, lock) check `isOrganizer`. Adding phone/Google sign-in later means linking tokens to an account table — no changes to the rest of the API.

## Privacy

Individual budgets never leave the server: members see only the group's min/median/max and a "fits X of Y budgets" count. The AI receives aggregated budgets and anonymous per-person style/interests/food — no names.

## Live updates

The website re-fetches the trip every 5 seconds while it's open (cheap, simple, works everywhere). If that ever becomes too chatty, swap it for Server-Sent Events from the API.
