/**
 * OpenAI planner.
 * - generate(): plans the trip with Structured Outputs, so the reply always matches AiPlanSchema.
 * - checkPrices(): re-prices the stays with the web_search tool (real rates for the dates + exact property pages).
 * - adjust(): re-times the existing itinerary after the stay or travel changed, keeping item ids.
 */
import OpenAI from 'openai'
import { zodResponseFormat, zodTextFormat } from 'openai/helpers/zod'
import { env } from '../../../config/env'
import { PriceCheckSchema, type PriceCheck, type PriceCheckInput } from '../price-check'
import { AiAdjustSchema, AiPlanSchema, type RawAdjust, type RawPlan } from '../schema'
import type { AdjustInput, Planner, PlannerInput } from '../types'
import { ADJUST_PROMPT, adjustPrompt, PRICE_CHECK_PROMPT, priceCheckPrompt, SYSTEM_PROMPT, userPrompt } from './prompt'

export function createOpenAIPlanner(): Planner {
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 240_000, maxRetries: 1 })
  const model = env.OPENAI_MODEL
  const effort = env.OPENAI_REASONING_EFFORT

  return {
    name: 'openai',
    model,

    async generate(input: PlannerInput): Promise<RawPlan> {
      const completion = await client.chat.completions.parse({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt(input) },
        ],
        response_format: zodResponseFormat(AiPlanSchema, 'trip_plan'),
        ...(effort ? { reasoning_effort: effort } : {}),
      })
      const msg = completion.choices[0]?.message
      if (msg?.refusal) throw new Error(`The AI declined to plan this trip: ${msg.refusal}`)
      if (!msg?.parsed) throw new Error(`The AI returned no plan (finish reason: ${completion.choices[0]?.finish_reason})`)
      return msg.parsed
    },

    async checkPrices(input: PriceCheckInput): Promise<PriceCheck> {
      const response = await client.responses.parse({
        model,
        tools: [{ type: 'web_search', user_location: { type: 'approximate', country: 'IN' } }],
        ...(effort ? { reasoning: { effort } } : {}),
        input: [
          { role: 'system', content: PRICE_CHECK_PROMPT },
          { role: 'user', content: priceCheckPrompt(input) },
        ],
        text: { format: zodTextFormat(PriceCheckSchema, 'price_check') },
      })
      if (!response.output_parsed) throw new Error('The price check returned no result')
      return response.output_parsed
    },

    async adjust(input: AdjustInput): Promise<RawAdjust> {
      const completion = await client.chat.completions.parse({
        model,
        messages: [
          { role: 'system', content: ADJUST_PROMPT },
          { role: 'user', content: adjustPrompt(input) },
        ],
        response_format: zodResponseFormat(AiAdjustSchema, 'itinerary_update'),
        ...(effort ? { reasoning_effort: effort } : {}),
      })
      const msg = completion.choices[0]?.message
      if (msg?.refusal) throw new Error(`The AI declined to update the itinerary: ${msg.refusal}`)
      if (!msg?.parsed) throw new Error('The AI returned no itinerary update')
      return msg.parsed
    },
  }
}
