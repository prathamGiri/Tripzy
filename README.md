# Tripzy

**Your whole group. One plan. Under 10 minutes.**
Everyone answers once (budget, travel style, interests, food, free dates). AI builds a complete trip that fits the whole group — day-by-day itinerary, stays and travel with booking links, cost per person against the group's budget — then the group 👍/👎 and swaps items instead of debating in chat.

## Quick start (Windows, macOS, Linux)

Requires **Node.js 20+**.

```bash
npm run setup      # install everything + create the local database
npm run dev        # API on :8787 + website on :5173
```

Open **http://localhost:5173**.

- AI planning needs an OpenAI key in `apps/api/.env` (`OPENAI_API_KEY=...`). Without a key, or with `AI_PROVIDER=mock`, the app uses built-in sample plans for Goa, Manali and Jaipur so the demo always works.
- `apps/api/.env.example` lists every setting. Copy it to `apps/api/.env` on a fresh machine.

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Shared-logic unit tests + API integration test (uses the offline planner, no AI cost) |
| `npm run typecheck` | Type-checks every package |
| `npm run build` | Production builds of API and website |
| `npm run db:studio` | Browse the database in your browser |
| `npm run ai:try -w @tripzy/api -- "Udaipur"` | Generate one real AI plan from the command line (costs one AI call) |

## Project layout

```
Tripzy/
├─ apps/
│  ├─ web/        React + Vite + Tailwind website (mobile-first)
│  ├─ api/        Node.js + Fastify + Prisma backend, AI planning
│  └─ mobile/     Expo (React Native) app — skeleton, see docs/mobile-plan.md
├─ packages/
│  └─ shared/     Types, validation, overlap & cost maths, booking links, API client
│                 (used by web, api and mobile)
├─ docs/          Architecture, API reference, AI planning, mobile plan, deployment
└─ demo/          Walkthrough video + the script that records it
```

Where to change things:

| I want to change… | Go to |
|---|---|
| How the AI plans (rules, tone, what it returns) | `apps/api/src/modules/ai/openai/prompt.ts`, `apps/api/src/modules/ai/schema.ts` |
| Which AI model / provider | `apps/api/.env` (`OPENAI_MODEL`, `AI_PROVIDER`); new providers: `apps/api/src/modules/ai/index.ts` |
| Booking sites, affiliate IDs | `packages/shared/src/booking.ts`, `.env` affiliate settings |
| Budget / date overlap logic | `packages/shared/src/overlap.ts`, `packages/shared/src/plan.ts` |
| An API endpoint | `apps/api/src/modules/<feature>/routes.ts` |
| Database tables | `apps/api/prisma/schema.prisma`, then `npm run db:migrate` |
| A screen on the website | `apps/web/src/screens/*.tsx` |
| Colours / design | `apps/web/tailwind.config.js`, `apps/web/src/components/ui.tsx` |
| Destinations in the offline demo | `apps/api/src/modules/ai/mock/destinations.ts` |

## How it works (short)

1. The organizer creates a trip → gets an invite link (`/j/<code>`).
2. Friends open the link, type their name (no sign-up) and answer 5 questions. Each person gets a secret token stored on their device.
3. The dashboard shows who's in, common dates, the budget range (individual budgets stay private) and shared interests.
4. The organizer taps **Generate**. The API runs a background job: it combines everyone's answers → asks the AI for a structured plan → checks each hotel's real price and booking pages on the web → validates it, recomputes all costs itself, picks the best stay + travel that fit the tightest budget (one AI retry if over budget) → adds booking links → saves it. Takes ~85 seconds with `gpt-5.5` at low reasoning effort (≈30 s of that is the hotel price check).
5. Everyone votes and swaps; the organizer locks the trip; the final screen lists **Book it** links for the chosen stay and travel.

More: [docs/architecture.md](docs/architecture.md) · [docs/api.md](docs/api.md) · [docs/ai-planning.md](docs/ai-planning.md) · [docs/mobile-plan.md](docs/mobile-plan.md) · [docs/deployment.md](docs/deployment.md)

## Demo mode

`DEMO_MODE=true` (default in development) adds:
- sample friends on new trips (3 answered, 2 pending) so a solo demo looks like a real group,
- the dark **DEMO** bar to switch between people and jump between screens,
- "See a sample plan" on the landing page.

Turn it off in production (`DEMO_MODE=false` on the API, `VITE_DEMO_TOOLS=false` on the website).

## Security notes

- Keep `apps/api/.env` private — it holds your AI key. It is git-ignored.
- Member tokens are bearer secrets: anyone with a token can act as that member. Invite codes only allow *joining*.
- Hotel prices are checked on the web at planning time and labelled with their source; they are snapshots, so people confirm the final price on the booking site (links go to the exact hotel page where possible).
