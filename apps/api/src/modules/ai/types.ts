import type { OverlapSummary, Preferences } from '@tripzy/shared'
import type { PriceCheck, PriceCheckInput } from './price-check'
import type { RawAdjust, RawPlan } from './schema'

export interface PlannerInput {
  destinationQuery: string | null // null = let the planner choose
  /** Starting cities and how many people come from each (LOCAL_ORIGIN = already there). */
  origins: { origin: string; people: number }[]
  /** Things already booked that the plan must use. */
  booked?: { stay?: { name: string; area: string }; travel: { origin: string; label: string; arrive: string | null; returnDepart: string | null }[] }
  dates: string[] // the exact trip dates (first = arrival, last = departure)
  groupSize: number
  overlap: OverlapSummary
  /** Each responder's answers, anonymised (no names, no individual budgets). */
  people: Pick<Preferences, 'style' | 'interests' | 'food'>[]
  /** Set on a retry, e.g. "the last plan was ₹3,000 over budget". */
  feedback?: string
}

export interface Planner {
  name: 'openai' | 'mock'
  model: string | null
  generate(input: PlannerInput): Promise<RawPlan>
  /** Optional: re-price the stays from the web (real rates for the dates, exact property pages). */
  checkPrices?(input: PriceCheckInput): Promise<PriceCheck>
  /** Re-time / adjust the itinerary after the stay or travel changed. */
  adjust(input: AdjustInput): Promise<RawAdjust>
}

export interface AdjustInput {
  destination: string
  region: string
  dates: string[]
  reason: string
  stay: { name: string; area: string }
  travel: { origin: string; people: number; mode: string; label: string; depart: string; arrive: string | null; returnDepart: string | null; duration: string }[]
  /** The current itinerary (swapped-in activities shown as they are now). */
  days: { date: string; title: string; items: { id: string; time: string; emoji: string; title: string; place: string; cost: number; travel: { mode: string; mins: number; cost: number } | null }[] }[]
}
