/**
 * Run the configured AI planner once with a sample group (from two cities) and print a summary.
 * Usage: npm run ai:try -w @tripzy/api [-- "Udaipur"]
 * Uses your real AI key (one plan + one price check).
 */
import { computeOverlap, costBreakdown, inr, pickStayAndTransport, travelOptions, type Preferences } from '@tripzy/shared'
import { env } from '../src/config/env'
import { applyPriceCheck, getPlanner, toPlanDocument } from '../src/modules/ai'

const dates = ['2026-12-16', '2026-12-17', '2026-12-18', '2026-12-19']
const people: Preferences[] = [
  { budget: 20000, style: 'relaxed', interests: ['beaches', 'food', 'nightlife'], food: [], dates, origin: 'Mumbai' },
  { budget: 25000, style: 'party', interests: ['nightlife', 'beaches', 'photography'], food: [], dates, origin: 'Mumbai' },
  { budget: 30000, style: 'adventure', interests: ['adventure', 'nature', 'food'], food: ['No seafood'], dates, origin: 'Delhi' },
  { budget: 20000, style: 'culture', interests: ['history', 'food', 'shopping'], food: ['Vegetarian'], dates, origin: 'Mumbai' },
]
const groups = [
  { origin: 'Mumbai', people: 3, minBudget: 20000 },
  { origin: 'Delhi', people: 1, minBudget: 30000 },
]
const destination = process.argv[2] ?? 'Goa'
const overlap = computeOverlap(people, { windowStart: dates[0], windowEnd: dates[3], days: 4, origin: 'Mumbai' })
const planner = getPlanner()
console.log(`Planner: ${planner.name}${planner.model ? ` (${planner.model})` : ''} → ${destination}`)

const t0 = Date.now()
const raw = await planner.generate({
  destinationQuery: destination,
  origins: groups.map(({ origin, people }) => ({ origin, people })),
  dates,
  groupSize: 5,
  overlap,
  people: people.map(({ style, interests, food }) => ({ style, interests, food })),
})
const ctx = {
  origin: 'Mumbai', origins: groups.map((g) => g.origin), dates, groupSize: 5, generatedWith: 4,
  source: 'ai' as const, model: planner.model, affiliates: env.affiliates,
}
let doc = toPlanDocument(raw, ctx)
const show = (label: string) =>
  console.log(`  ${label}:`, doc.stays.map((s) => `${s.name} (${s.tier}) ${inr(s.roomRate)}/room × ${s.rooms} → ${inr(s.pricePerNight)}/person/night [${s.priceSource}]`).join(' | '))
console.log(`Planned in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${doc.destination.emoji} ${doc.destination.name}, ${doc.destination.region}`)
for (const d of doc.days) console.log(`  ${d.date}  ${d.title}: ${d.items.map((a) => `${a.time} ${a.title}`).join(' · ')}`)
for (const g of doc.travel) console.log(`  Travel from ${g.origin}:`, g.options.map((t) => `${t.label} ${inr(t.price)}${t.arrive ? ` (arr ${t.arrive})` : ''}`).join(' | '))
show('AI estimate')

if (planner.checkPrices) {
  const t1 = Date.now()
  const check = await planner.checkPrices({
    city: doc.destination.name, region: doc.destination.region, checkin: dates[0], checkout: dates[3], nights: 3, groupSize: 5,
    maxPerPersonPerNight: 2500,
    stays: doc.stays.map((s) => ({ name: s.name, area: s.area, tier: s.tier, roomRate: s.roomRate, guestsPerRoom: s.guestsPerRoom, wholeProperty: s.wholeProperty })),
  })
  doc = applyPriceCheck(doc, check, ctx)
  console.log(`Price check in ${((Date.now() - t1) / 1000).toFixed(1)}s`)
  show('Web-checked')
}

const pick = pickStayAndTransport(doc, doc.days, groups)
for (const g of groups) {
  const t = travelOptions(doc, g.origin).find((o) => o.id === pick.transportIds[g.origin]) ?? null
  console.log(`  ${g.origin}: ${pick.stay.name} + ${t?.label ?? 'no travel'} → ${inr(costBreakdown(doc, doc.days, pick.stay, t).total)} per person (tightest budget ${inr(g.minBudget)})`)
}
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s, fits everyone: ${pick.fits}`)
