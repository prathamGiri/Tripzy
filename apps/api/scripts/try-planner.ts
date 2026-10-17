/**
 * Run the configured AI planner once with a sample group and print a summary.
 * Usage: npm run ai:try -w @tripzy/api [-- "Udaipur"]
 * Uses your real AI key (costs one generation).
 */
import { computeOverlap, costBreakdown, inr, pickStayAndTransport, type Preferences } from '@tripzy/shared'
import { env } from '../src/config/env'
import { applyPriceCheck, getPlanner, toPlanDocument } from '../src/modules/ai'

const dates = ['2026-12-16', '2026-12-17', '2026-12-18', '2026-12-19']
const people: Preferences[] = [
  { budget: 20000, style: 'relaxed', interests: ['beaches', 'food', 'nightlife'], food: [], dates },
  { budget: 25000, style: 'party', interests: ['nightlife', 'beaches', 'photography'], food: [], dates },
  { budget: 30000, style: 'adventure', interests: ['adventure', 'nature', 'food'], food: ['No seafood'], dates },
  { budget: 20000, style: 'culture', interests: ['history', 'food', 'shopping'], food: ['Vegetarian'], dates },
]
const destination = process.argv[2] ?? 'Goa'
const overlap = computeOverlap(people, { windowStart: dates[0], windowEnd: dates[3], days: 4 })
const planner = getPlanner()
console.log(`Planner: ${planner.name}${planner.model ? ` (${planner.model})` : ''} → ${destination}`)

const t0 = Date.now()
const raw = await planner.generate({
  destinationQuery: destination,
  origin: 'Mumbai',
  dates,
  groupSize: 5,
  overlap,
  people: people.map(({ style, interests, food }) => ({ style, interests, food })),
})
let doc = toPlanDocument(raw, {
  origin: 'Mumbai', dates, groupSize: 5, generatedWith: 4, source: 'ai', model: planner.model, affiliates: env.affiliates,
})
const show = (label: string) =>
  console.log(`  ${label}:`, doc.stays.map((s) => `${s.name} (${s.tier}) ${inr(s.roomRate)}/room × ${s.rooms} → ${inr(s.pricePerNight)}/person/night [${s.priceSource}]`).join(' | '))
console.log(`Planned in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
show('AI estimate')

if (planner.checkPrices) {
  const t1 = Date.now()
  const check = await planner.checkPrices({
    city: doc.destination.name, region: doc.destination.region, checkin: dates[0], checkout: dates[3], nights: 3, groupSize: 5,
    maxPerPersonPerNight: 2500,
    stays: doc.stays.map((s) => ({ name: s.name, area: s.area, tier: s.tier, roomRate: s.roomRate, guestsPerRoom: s.guestsPerRoom, wholeProperty: s.wholeProperty })),
  })
  doc = applyPriceCheck(doc, check, { groupSize: 5, affiliates: env.affiliates })
  console.log(`Price check in ${((Date.now() - t1) / 1000).toFixed(1)}s`)
  show('Web-checked')
  for (const st of doc.stays) console.log(`    ${st.name}: ${st.priceNote ?? ''}
      MMT: ${st.links[1].url}
      Booking: ${st.links[0].url.slice(0, 110)}`)
}

const pick = pickStayAndTransport(doc, doc.days, overlap.budget.min)
const cost = costBreakdown(doc, doc.days, pick.stay, pick.transport)

console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${doc.destination.emoji} ${doc.destination.name}, ${doc.destination.region}`)
for (const d of doc.days) console.log(`  ${d.date}  ${d.title}: ${d.items.map((a) => `${a.time} ${a.title}`).join(' · ')}`)
console.log('  Travel:', doc.transports.map((t) => `${t.label} ${inr(t.price)}`).join(' | '))
console.log(`  Picked: ${pick.stay.name} + ${pick.transport.label} → ${inr(cost.total)} per person (budget ${inr(overlap.budget.min)}, fits: ${pick.fits})`)
