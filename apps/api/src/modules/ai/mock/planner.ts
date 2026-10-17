/**
 * Offline planner built on hand-written sample data (Goa, Manali, Jaipur).
 * Used when no OpenAI key is configured or AI_PROVIDER=mock. It still adapts to the group:
 * it picks the destination (if asked), the days that match the group's interests, and the food tier.
 */
import { tagWeights, type OverlapSummary, type Tier } from '@tripzy/shared'
import type { RawPlan } from '../schema'
import type { Planner, PlannerInput } from '../types'
import { DESTINATIONS } from './destinations'
import type { Activity, Alt, Destination, Origin } from './types'

const foodTier = (minBudget: number): Tier => (minBudget < 16000 ? 'budget' : minBudget < 35000 ? 'mid' : 'premium')

export function chooseDestination(query: string | null, ov: OverlapSummary): Destination {
  const q = query?.trim().toLowerCase()
  const exact = q ? DESTINATIONS.find((d) => q.includes(d.id) || q.includes(d.name.toLowerCase())) : undefined
  if (exact) return exact
  const w = tagWeights(ov)
  const score = (d: Destination) => d.bestFor.reduce((s, t) => s + (w[t] ?? 0), 0)
  return [...DESTINATIONS].sort((a, b) => score(b) - score(a))[0]
}

function pickDays(dest: Destination, ov: OverlapSummary, days: number) {
  const middle = Math.max(0, Math.min(days - 2, dest.days.length))
  const w = tagWeights(ov)
  return dest.days
    .map((d, i) => ({ d, i, score: d.tags.reduce((s, t) => s + (w[t] ?? 0), 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, middle)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.d)
}

const alt = (a: Alt) => ({ emoji: a.emoji, title: a.title, place: a.place, costPerPerson: a.cost, tags: a.tags, why: a.why })
const activity = (a: Activity) => ({
  ...alt(a),
  time: a.time,
  travelFromPrevious: a.travel ? { mode: a.travel.mode, minutes: a.travel.mins, costPerPerson: a.travel.cost } : null,
  alternatives: (a.alts ?? []).map(alt),
})

export function mockPlan(input: PlannerInput): RawPlan {
  const dest = chooseDestination(input.destinationQuery, input.overlap)
  const templates = [dest.arrival, ...pickDays(dest, input.overlap, input.dates.length), dest.departure]
  const transports = dest.getThere[input.origin as Origin] ?? dest.getThere.Mumbai

  return {
    destination: { name: dest.name, region: dest.region, emoji: dest.emoji, tagline: dest.tagline },
    days: templates.map((t) => ({ title: t.title, items: t.items.map(activity) })),
    stays: dest.stays.map((s) => ({
      name: s.name, area: s.area, kind: s.kind, emoji: s.emoji, tier: s.tier,
      roomRatePerNight: s.pricePerNight * 2, guestsPerRoom: 2, wholeProperty: false,
      rating: s.rating, perks: s.perks, why: s.why,
    })),
    transports: transports.map((t) => ({
      mode: t.mode, label: t.label, duration: t.duration, departTime: t.depart, pricePerPersonOneWay: t.price, note: t.note,
    })),
    foodPerDayPerPerson: dest.foodPerDay[foodTier(input.overlap.budget.min || 20000)],
    tips: [
      'Sample plan (offline mode) — add an OpenAI key for a fully personalised plan.',
      'Book trains early; popular routes fill up weeks ahead in peak season.',
      'Split shared costs as you go with any UPI split app.',
    ],
  }
}

export function createMockPlanner(): Planner {
  return {
    name: 'mock',
    model: null,
    async generate(input) {
      await new Promise((r) => setTimeout(r, 1200)) // feel like real work
      return mockPlan(input)
    },
  }
}
