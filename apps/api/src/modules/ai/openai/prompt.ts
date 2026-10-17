/** Prompts for the OpenAI planner. Edit here to change the planning behaviour. */
import { fmtDate, inr, LOCAL_ORIGIN, STYLES } from '@tripzy/shared'
import type { PriceCheckInput } from '../price-check'
import type { AdjustInput, PlannerInput } from '../types'

export const SYSTEM_PROMPT = `You are Tripzy's trip planner. You plan complete group trips within India for groups of friends.

Your plan must be realistic enough that the group could book it today:
- Use real places, restaurants, attractions and stays that exist. Prefer well-known, well-reviewed options. Never invent hotel names.
- All prices are in Indian Rupees (INR) at realistic prices for these exact dates. Mind the season: Dec–Jan, long weekends and festivals are peak — hotel rates often double.
- Stays: give the price the property charges per ROOM per night including taxes (as shown on MakeMyTrip/Booking.com), how many adults share a room, or a whole-property price for villas. Never quote a per-person or "starting from" off-season price. Boutique, lake/sea-view and 4-5★ properties usually cost ₹8,000–30,000+ per room per night in peak season; pick stays the group can actually afford.
- Use each property's exact name as listed on MakeMyTrip / Booking.com.
- The total per person (return travel + stay + food + activities + local transport) must fit within the group's TIGHTEST budget. Leave ~5% headroom.
- Respect every food restriction: meal suggestions must work for everyone.
- Match the group's dominant travel style and the interests most people share; give the minority something too.
- People may start from different cities. Give 2-3 travel options for EACH starting city (fastest first, with realistic arrival times). Day 1 starts once the LAST group has arrived: plan an easy "while you wait" for early arrivers, then the group plan. The last day ends in time for the EARLIEST departure home.
- Day 1 is the arrival day (travel, check-in, an easy evening). The last day is the departure day (light morning, then head home). Plan full days in between.
- If a stay or travel is already booked, use exactly that and plan around it.
- Each day has 3-5 timed items in order, with how the group gets between them (mode, minutes, cost per person).
- Most non-logistics items get 1-2 alternatives the group could swap in for the same slot.
- "why" fields speak to THIS group (e.g. "4 of 5 of you picked nightlife"), one sentence each.
- Tags: use only the allowed tag values. Pure logistics items (arrive, check in, head home) have an empty tags list.
- Return exactly three stays (budget, mid, premium) and 2-3 transport options from the origin city, fastest first.`

export function userPrompt(i: PlannerInput) {
  const ov = i.overlap
  const styleName = (s: string) => STYLES.find((x) => x.id === s)?.label ?? s
  const lines = [
    i.destinationQuery
      ? `Destination: ${i.destinationQuery}`
      : `Destination: not decided — choose the single best destination in India for this group, their budget and these dates.`,
    `Starting cities: ${i.origins.map((o) => (o.origin === LOCAL_ORIGIN ? `already at the destination ×${o.people}` : `${o.origin} ×${o.people}`)).join(', ')}. Give travel options for: ${i.origins.filter((o) => o.origin !== LOCAL_ORIGIN).map((o) => o.origin).join(', ') || 'nobody (all local)'}.`,
    `Dates: ${fmtDate(i.dates[0])} to ${fmtDate(i.dates[i.dates.length - 1])} (${i.dates.length} days, ${i.dates.length - 1} nights). Plan exactly ${i.dates.length} days.`,
    `Group size: ${i.groupSize} people (${ov.respondedCount} have shared preferences).`,
    `Budget per person, all-in: tightest ${inr(ov.budget.min)}, median ${inr(ov.budget.median)}, highest ${inr(ov.budget.max)}. Plan to the tightest.`,
    `Travel styles: ${ov.styles.map((s) => `${styleName(s.key)} ×${s.count}`).join(', ')}.`,
    `Interests: ${ov.interests.map((s) => `${s.key} ×${s.count}`).join(', ')}.`,
    `Food restrictions: ${ov.food.length ? ov.food.map((f) => `${f.key} ×${f.count}`).join(', ') : 'none'}.`,
    `Individual answers (anonymous): ${JSON.stringify(i.people)}`,
  ]
  if (i.booked?.stay) lines.push(`Stay ALREADY BOOKED: ${i.booked.stay.name}, ${i.booked.stay.area}. Use it as the base and list it as the mid-tier stay.`)
  for (const b of i.booked?.travel ?? [])
    lines.push(`Travel from ${b.origin} ALREADY BOOKED: ${b.label}${b.arrive ? `, arriving ${b.arrive}` : ''}${b.returnDepart ? `, leaving ${b.returnDepart} on the last day` : ''}.`)
  if (i.feedback) lines.push('', `IMPORTANT — fix this from your previous attempt: ${i.feedback}`)
  return lines.join('\n')
}

/* ---------- hotel price check (web search) ---------- */

export const PRICE_CHECK_PROMPT = `You check hotel prices for Tripzy, a group-trip planner in India. Use web search.

For each stay you are given:
1. Find its current listing on MakeMyTrip, Booking.com, Agoda, Goibibo or the property's own site, and the price for the given dates (or the closest dates/season you can find).
2. Report the price per ROOM per night INCLUDING taxes in INR (or the whole-property price for villas), and how many adults share a room.
3. Give the exact property name as listed, and the property's own page URLs on makemytrip.com and booking.com if you see them. Never make URLs up — use null if you did not see the page.
4. If a stay costs more per person per night than the limit given, REPLACE it with a real, well-reviewed property in the same area that fits the limit (keep the tier label), and price that one instead. Do not replace the premium tier just for being expensive unless it exceeds 3× the limit.
5. If you cannot find a listing at all, set found=false and give your best estimate for the season.

Be conservative: when sources disagree, use the typical (median) price for those dates, not the cheapest teaser rate.

Writing rules (the group sees these fields):
- "kind" is the property type only, e.g. "Heritage haveli hotel", "Boutique hotel", "Hostel · private room". Never repeat the tier.
- "why" and "perks" speak to the group about the stay itself (location, vibe, value). Never mention limits, caps, budgets per room, replacements or your checking process.
- "note" is for the price only: where you saw it and for which dates, e.g. "MakeMyTrip, 16–19 Dec: ₹4,111 + ₹206 taxes per room".`

export function priceCheckPrompt(i: PriceCheckInput) {
  return [
    `Destination: ${i.city} (${i.region})`,
    `Check-in ${i.checkin}, check-out ${i.checkout} (${i.nights} nights). Group of ${i.groupSize} adults.`,
    `Limit per person per night for the stay (budget and mid tiers): ${inr(i.maxPerPersonPerNight)}.`,
    `Stays to check:`,
    ...i.stays.map(
      (s, k) =>
        `${k + 1}. ${s.name} — ${s.area} — ${s.tier} tier — planner's guess ${inr(s.roomRate)} per ${s.wholeProperty ? 'night for the whole property' : `room per night, ${s.guestsPerRoom} per room`}`,
    ),
  ].join('\n')
}

/* ---------- itinerary update after stay/travel changes ---------- */

export const ADJUST_PROMPT = `You update an existing group-trip itinerary in India after the stay or travel changed.

Change as little as possible:
- Keep every item that still works, with its keepId set to its existing id. You may change its time and how the group gets there (travelFromPrevious) — e.g. new travel times from a stay in a different area.
- Re-time Day 1 so it starts after the LAST group arrives (leave ~45-60 min for getting to the stay), with an easy option for early arrivers if the gap is long.
- On the last day, finish in time for the EARLIEST departure home (leave ~1.5 h for airports, ~1 h for stations).
- Only add new items (keepId null) or drop items when timing makes them impossible. Keep the same number of days.
- For kept items, copy title, place, emoji, tags, cost and alternatives unchanged. New items follow the usual rules: real places, INR per person, 1-2 alternatives.
- summary: one friendly sentence telling the group what changed.`

export function adjustPrompt(i: AdjustInput) {
  return [
    `Destination: ${i.destination} (${i.region}). Dates ${i.dates[0]} to ${i.dates[i.dates.length - 1]}.`,
    `What changed: ${i.reason}`,
    `Stay: ${i.stay.name}, ${i.stay.area}`,
    `Travel by starting city:`,
    ...i.travel.map(
      (t) =>
        `- ${t.origin} (×${t.people}): ${t.label} (${t.mode}), departs ${t.depart || '?'}${t.arrive ? `, arrives ${t.arrive}` : `, takes ${t.duration || '?'}`}${t.returnDepart ? `; return leaves ${t.returnDepart} on the last day` : ''}`,
    ),
    `Current itinerary (JSON):`,
    JSON.stringify(i.days),
  ].join('\n')
}
