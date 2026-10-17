# AI planning

## Pipeline (`apps/api/src/modules/plans/service.ts`)

1. **Combine answers** — `computeOverlap()` finds the best run of dates, the budget range, interest/style counts and food restrictions.
2. **Ask the planner** — `getPlanner().generate(input)`:
   - `openai` → `modules/ai/openai/planner.ts` calls Chat Completions with **Structured Outputs** (`zodResponseFormat(AiPlanSchema)`), so the reply always matches the schema.
   - `mock` → `modules/ai/mock/planner.ts` builds the same shape from sample data (Goa, Manali, Jaipur) — used without a key and in tests.
3. **Enrich** (`modules/ai/enrich.ts`) — assigns stable ids, attaches real dates, clamps numbers, adds booking links (`packages/shared/src/booking.ts`) and a colour theme.
4. **Check hotel prices on the web** (`checkPrices`, OpenAI `web_search` tool, `modules/ai/price-check.ts` + `PRICE_CHECK_PROMPT`). Each stay is looked up on MakeMyTrip / Booking.com / Agoda for the trip dates: real room rate incl. taxes, rooms needed, exact listed name, and the property's own MakeMyTrip / Booking.com pages. A stay that would break the budget is swapped for a real cheaper one nearby. If the check fails, the plan keeps the AI's estimates and they are labelled "≈ AI estimate". Adds ~30 s.
5. **Check the budget in code** — `pickStayAndTransport()` recomputes the total itself (the AI's arithmetic is never trusted) and picks the best stay + fastest travel under 95 % of the tightest budget. If nothing fits, the AI gets one retry with the exact overspend as feedback.
6. **Save** a new plan version; demo friends cast their votes.

## Tuning

| Setting (`apps/api/.env`) | Effect |
|---|---|
| `OPENAI_MODEL=gpt-5.5` | Model used. Any model your key can access that supports Structured Outputs. |
| `OPENAI_REASONING_EFFORT=low` | `low` ≈ 50 s to plan + ≈ 30 s to check hotel prices (measured ≈ 85 s total). `medium`/`high` are slower (≈ 90 s+) and more thorough. Leave empty for models without reasoning. |
| `AI_PROVIDER=mock` | Force the offline planner (demos without internet, UI work). |

Measured with `gpt-5.5`: ~93 s at default effort, ~52 s at `low`, both producing real hotels (e.g. Zostel, Moustache, Jagat Niwas in Udaipur), real trains, and plans within budget. Try a smaller/faster model (e.g. `gpt-5.4-mini`) if speed matters more than polish — test with `npm run ai:try -w @tripzy/api`.

## Changing what the AI does

- **Rules & tone** → `modules/ai/openai/prompt.ts` (`SYSTEM_PROMPT`, `userPrompt`).
- **What it returns** → `modules/ai/schema.ts`. Keep it to plain objects/arrays/enums/nullable fields (Structured Outputs doesn't support min/max/regex — check those in `enrich.ts`). If you add a field, add it to `PlanDocument` in `packages/shared/src/types.ts` and map it in `enrich.ts`.
- **Another provider** (e.g. Claude, Gemini) → implement the `Planner` interface (`modules/ai/types.ts`) in a new folder and add it to `modules/ai/index.ts`.

## How stay prices work

Hotels charge per room, so every stay stores `roomRate` (per room per night incl. taxes, or the whole villa), `guestsPerRoom`, `rooms` = ⌈group ÷ guestsPerRoom⌉ and `pricePerNight` per person = roomRate × rooms ÷ group. Each stay carries `priceSource` (`web` / `estimate` / `sample`), a `priceNote` saying where the price was seen, and source links — the Stay tab shows all of this. Web-checked prices were within ~20 % of the live MakeMyTrip price in testing; they are still a snapshot, so the UI asks people to confirm on the booking site. For exact live prices by date, plug in a hotel-price API (e.g. SerpApi Google Hotels) as another `checkPrices` implementation.

## Booking links

Stays link to the **exact property page** where possible — the MakeMyTrip / Booking.com page found during the price check, or MakeMyTrip's page built from the exact listed name (`makemytrip.com/hotels/<hotel_name>-details-<city>.html`). Otherwise a search pre-filled with hotel, dates and guests:

| Item | Links |
|---|---|
| Stays | Booking.com (property page + dates, or search), MakeMyTrip (property page), Google Hotels |
| Flights | Google Flights (route + dates), MakeMyTrip Flights |
| Trains | IRCTC, MakeMyTrip Rail |
| Buses | redBus (route + date) |
| Places in the itinerary | Google Maps |

To earn commission, join the Booking.com Affiliate Partner Programme / MakeMyTrip affiliate programme and set `BOOKING_AFFILIATE_ID` / `MAKEMYTRIP_AFFILIATE_ID`. Add new sites in `packages/shared/src/booking.ts` only.

## Cost

One plan ≈ 6–10k input + 6–12k output tokens (plus reasoning tokens). Regenerating costs another call; votes, swaps and stay/transport changes cost nothing (alternatives are generated up front).

## Ideas for later

- Stream the plan day by day so the first day appears in ~10 s.
- Use a web-search-capable model to verify hotels and fetch live prices.
- Cache plans for identical inputs; let organizers regenerate only one day.
