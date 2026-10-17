import type { OverlapSummary, Preferences } from '@tripzy/shared'
import type { PriceCheck, PriceCheckInput } from './price-check'
import type { RawPlan } from './schema'

export interface PlannerInput {
  destinationQuery: string | null // null = let the planner choose
  origin: string
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
}
