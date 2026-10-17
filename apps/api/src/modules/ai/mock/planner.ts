/**
 * Offline planner built on hand-written sample data (Goa, Manali, Jaipur).
 * Used when no OpenAI key is configured or AI_PROVIDER=mock. It still adapts to the group:
 * it picks the destination (if asked), the days that match the group's interests, and the food tier.
 */
import { LOCAL_ORIGIN, tagWeights, type OverlapSummary, type Tier } from '@tripzy/shared'
import type { RawAdjust, RawPlan } from '../schema'
import type { AdjustInput, Planner, PlannerInput } from '../types'
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
  const travel = input.origins
    .filter((o) => o.origin !== LOCAL_ORIGIN)
    .map((o) => ({
      origin: o.origin,
      // Sample data covers Mumbai, Delhi, Bengaluru and Pune; other cities borrow Mumbai's options.
      options: (dest.getThere[o.origin as Origin] ?? dest.getThere.Mumbai).map((t) => ({
        mode: t.mode, label: t.label, duration: t.duration, departTime: t.depart, arriveTime: null, pricePerPersonOneWay: t.price, note: t.note,
      })),
    }))

  return {
    destination: { name: dest.name, region: dest.region, emoji: dest.emoji, tagline: dest.tagline },
    days: templates.map((t) => ({ title: t.title, items: t.items.map(activity) })),
    stays: dest.stays.map((s) => ({
      name: s.name, area: s.area, kind: s.kind, emoji: s.emoji, tier: s.tier,
      roomRatePerNight: s.pricePerNight * 2, guestsPerRoom: 2, wholeProperty: false,
      rating: s.rating, perks: s.perks, why: s.why,
    })),
    travel,
    foodPerDayPerPerson: dest.foodPerDay[foodTier(input.overlap.budget.min || 20000)],
    tips: [
      'Sample plan (offline mode) — add an OpenAI key for a fully personalised plan.',
      'Book trains early; popular routes fill up weeks ahead in peak season.',
      'Split shared costs as you go with any UPI split app.',
    ],
  }
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return Number.isFinite(h) ? h * 60 + (m || 0) : NaN
}
const toHHMM = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`

/**
 * Offline itinerary update: Day 1 starts an hour after the last arrival; later Day-1 items only move
 * if they would now overlap (each keeps at least an hour after the previous one). Other days are unchanged.
 */
export function mockAdjust(input: AdjustInput): RawAdjust {
  const arrivals = input.travel.map((t) => (t.arrive ? toMin(t.arrive) : NaN)).filter(Number.isFinite)
  const start = arrivals.length ? Math.max(...arrivals) + 60 : NaN
  let moved = false
  let prev = NaN
  return {
    days: input.days.map((d, di) => ({
      title: d.title,
      items: d.items.map((a, ai) => {
        let time = a.time
        if (di === 0 && Number.isFinite(start)) {
          const floor = ai === 0 ? start : prev + 60
          const t = Math.min(23 * 60, Math.max(toMin(a.time), floor))
          if (t !== toMin(a.time)) moved = true
          prev = t
          time = toHHMM(t)
        }
        return {
          keepId: a.id,
          time,
          emoji: a.emoji, title: a.title, place: a.place, costPerPerson: a.cost, tags: [], why: '',
          travelFromPrevious: a.travel ? { mode: a.travel.mode, minutes: a.travel.mins, costPerPerson: a.travel.cost } : null,
          alternatives: [],
        }
      }),
    })),
    summary: moved ? `Day 1 now starts at ${toHHMM(start)}, an hour after the last arrival.` : 'The itinerary already works with this change.',
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
    async adjust(input) {
      await new Promise((r) => setTimeout(r, 800))
      return mockAdjust(input)
    },
  }
}
