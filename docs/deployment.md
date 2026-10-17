# Deployment

A simple, low-cost setup:

| Piece | Suggested host | Notes |
|---|---|---|
| Website (`apps/web`) | Vercel / Netlify / Cloudflare Pages | Static build: `npm run build -w @tripzy/web` → `apps/web/dist`. Add a SPA fallback so `/j/...` routes serve `index.html`. |
| API (`apps/api`) | Render / Railway / Fly.io | `npm run build -w @tripzy/api`, start with `npm run start -w @tripzy/api`. Long-running server (plan jobs run in-process). |
| Database | Neon / Supabase (PostgreSQL) | Free tiers are enough to start. |

## Switch the database to PostgreSQL

1. In `apps/api/prisma/schema.prisma` change `provider = "sqlite"` to `provider = "postgresql"`.
2. Delete `apps/api/prisma/migrations` (SQLite-specific) and run `npm run db:migrate` against a Postgres `DATABASE_URL` to create fresh migrations. Commit them.
3. In production run `npm run db:deploy -w @tripzy/api` on each release.

## Environment

API (`apps/api/.env` → your host's environment settings):

```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=low
DEMO_MODE=false
CORS_ORIGINS=https://tripzy.app
PUBLIC_WEB_URL=https://tripzy.app
```

Website (build-time):

```
VITE_API_URL=https://api.tripzy.app
VITE_DEMO_TOOLS=false
```

## Before going public

- Rate-limit `POST /trips`, `POST /invites/:code/join` and `POST /trips/:id/plans` (e.g. `@fastify/rate-limit`) — plan generation costs money.
- Add a per-trip limit on regenerations.
- Move plan jobs to a queue (e.g. BullMQ + Redis) if you run more than one API instance.
- Set up error monitoring (Sentry) and log AI cost per plan.
