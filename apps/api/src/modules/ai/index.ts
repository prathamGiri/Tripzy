/** Picks the planner from config. To add another AI provider, implement `Planner` and add it here. */
import { env } from '../../config/env'
import { createMockPlanner } from './mock/planner'
import { createOpenAIPlanner } from './openai/planner'
import type { Planner } from './types'

let planner: Planner | null = null

export function getPlanner(): Planner {
  planner ??= env.aiProvider === 'openai' ? createOpenAIPlanner() : createMockPlanner()
  return planner
}

export { createMockPlanner } from './mock/planner'
export { toPlanDocument, assertUsable, applyPriceCheck, mergeAdjusted } from './enrich'
export type { AdjustInput, Planner, PlannerInput } from './types'
