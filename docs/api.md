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
| `PATCH /trips/:id/plan` | see below | `{ stayId?, transportId?, origin? }` | `TripView` — marks the itinerary out of date |
| `POST /trips/:id/plan/adjust` | organizer or sole traveller | – | `202 JobView` — re-times the itinerary around the current stay/travel, keeping votes and swaps |
| `PUT /trips/:id/bookings/stay` | organizer | `StayBookingInput` | `TripView` — then updates the itinerary automatically |
| `DELETE /trips/:id/bookings/stay` | organizer | – | `TripView` |
| `PUT /trips/:id/bookings/travel/:origin` | see below | `TravelBookingInput` | `TripView` — then updates the itinerary automatically |
| `DELETE /trips/:id/bookings/travel/:origin` | see below | – | `TripView` |
| `POST /trips/:id/plan/votes` | member | `{ itemId, value: "up" \| "down" \| null }` | `TripView` |
| `POST /trips/:id/plan/swaps` | member | `{ slotId, altId \| null }` | `TripView` (also records a 👍 from the swapper) |

Demo-only (`DEMO_MODE=true`, otherwise 404):

| Method & path | Auth | Returns |
|---|---|---|
| `GET /demo/trips/:id/tokens` | member | every member's token (for the person switcher) |
| `POST /demo/sample-trip` | – | a Goa trip where all 6 people have answered: `{ tripId, tokens }` |

**Who can change what.** The stay: the organizer. A starting city's travel: the organizer, or — if exactly one person travels from that city — that person (`TripView.me.editableOrigins` lists them). After a trip is locked, plan changes return `409`; bookings and itinerary updates still work, since that's when people book.

**Per-person costs.** Everyone has a starting city (`Preferences.origin`, default = the trip's `origin`, or `"Already there"`). Travel options are per city (`PlanDocument.travel`), choices per city (`PlanView.transportIds`). Use `personalCost(plan, origin)` from `@tripzy/shared` for one person's total; bookings override suggestions via `effectiveStay` / `effectiveTransport`.

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
