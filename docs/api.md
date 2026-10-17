# API reference

Base URL: `http://localhost:8787` in development (the website reaches it as `/api` through the Vite proxy).
All bodies are JSON. Authenticated calls send `Authorization: Bearer <memberToken>`.
Errors look like `{ "error": "message", "details": {...} }` with a matching HTTP status.

Types referenced below live in `packages/shared/src/types.ts`; request schemas in `packages/shared/src/schemas.ts`. The typed client `TripzyApi` (`packages/shared/src/api.ts`) wraps every call.

| Method & path | Auth | Body | Returns |
|---|---|---|---|
| `GET /health` | – | – | `{ ok, ai, demo }` |
| `POST /trips` | – | `CreateTripInput` | `201 { trip: TripView, token }` (organizer token) |
| `GET /trips/:id` | member | – | `TripView` |
| `POST /trips/:id/lock` | organizer | – | `TripView` (409 if no plan) |
| `GET /invites/:code` | – | – | `InvitePreview` |
| `POST /invites/:code/join` | – | `{ name }` | `201 MemberToken` |
| `PUT /trips/:id/members/me/prefs` | member | `Preferences` | `TripView` |
| `POST /trips/:id/plans` | organizer | – | `202 JobView` (returns the running job if one exists; 400 if < 2 responses) |
| `GET /trips/:id/plans/jobs/:jobId` | member | – | `JobView` — poll until `status` is `done` or `failed` |
| `PATCH /trips/:id/plan` | member | `{ stayId?, transportId? }` | `TripView` |
| `POST /trips/:id/plan/votes` | member | `{ itemId, value: "up" \| "down" \| null }` | `TripView` |
| `POST /trips/:id/plan/swaps` | member | `{ slotId, altId \| null }` | `TripView` (also records a 👍 from the swapper) |

Demo-only (`DEMO_MODE=true`, otherwise 404):

| Method & path | Auth | Returns |
|---|---|---|
| `GET /demo/trips/:id/tokens` | member | every member's token (for the person switcher) |
| `POST /demo/sample-trip` | – | a Goa trip where all 6 people have answered: `{ tripId, tokens }` |

After a trip is locked, every write returns `409`.

## Typical flow

```
POST /trips                         → organizer token
GET  /invites/goa-k7m3qx            → friend sees preview
POST /invites/goa-k7m3qx/join       → friend token
PUT  /trips/:id/members/me/prefs    (each person)
POST /trips/:id/plans               → { id: jobId, status: "queued" }
GET  /trips/:id/plans/jobs/:jobId   … until "done"
GET  /trips/:id                     → trip.plan with booking links
POST /trips/:id/plan/votes | swaps, PATCH /trips/:id/plan
POST /trips/:id/lock
```
