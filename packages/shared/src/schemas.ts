/** Request validation, shared so the clients can validate forms with the same rules as the API. */
import { z } from 'zod'
import { INTEREST_IDS, STYLE_IDS } from './options'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')

export const PreferencesSchema = z.object({
  budget: z.number().int().min(1000).max(1_000_000),
  style: z.enum(STYLE_IDS),
  interests: z.array(z.enum(INTEREST_IDS)).min(1).max(9),
  food: z.array(z.string().max(40)).max(10),
  dates: z.array(isoDate).min(1).max(62),
  completedInSec: z.number().int().min(0).max(36000).optional(),
})

export const CreateTripSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    organizerName: z.string().trim().min(1).max(40),
    destinationQuery: z.string().trim().min(2).max(80).nullable(),
    origin: z.string().trim().min(2).max(60),
    windowStart: isoDate,
    windowEnd: isoDate,
    days: z.number().int().min(2).max(10),
    groupSize: z.number().int().min(2).max(20),
    /** Demo mode only: pre-fill a few friends so the dashboard looks lived-in. */
    seedDemoFriends: z.boolean().optional(),
  })
  .refine((v) => v.windowEnd >= v.windowStart, { message: 'windowEnd must be on or after windowStart', path: ['windowEnd'] })

export const JoinSchema = z.object({ name: z.string().trim().min(1).max(40) })

export const VoteSchema = z.object({ itemId: z.string().min(1).max(80), value: z.enum(['up', 'down']).nullable() })

export const SwapSchema = z.object({ slotId: z.string().min(1).max(80), altId: z.string().min(1).max(80).nullable() })

export const SelectSchema = z.object({
  stayId: z.string().min(1).max(80).optional(),
  transportId: z.string().min(1).max(80).optional(),
})

export type CreateTripInput = z.infer<typeof CreateTripSchema>
export type JoinInput = z.infer<typeof JoinSchema>
