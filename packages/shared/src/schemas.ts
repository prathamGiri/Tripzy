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
  origin: z.string().trim().min(2).max(60).optional(),
  completedInSec: z.number().int().min(0).max(36000).optional(),
})

export const CreateTripSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    organizerName: z.string().trim().min(1).max(40),
    destinationQuery: z.string().trim().min(2).max(80).nullable(),
    /** Optional group default; normally each person gives their own starting city in their preferences. */
    origin: z.string().trim().min(2).max(60).optional(),
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
  /** Which starting city the transport choice is for (defaults to the member's own). */
  origin: z.string().trim().min(2).max(60).optional(),
})

const hhmmTime = z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM')
const optText = (max: number) => z.string().trim().max(max).nullable().optional()
const optUrl = z.string().trim().url().max(500).nullable().optional()

/** "We booked the stay": either the suggested option (optionId) or a different property. */
export const StayBookingSchema = z
  .object({
    optionId: z.string().min(1).max(80).nullable(),
    name: z.string().trim().min(2).max(120).optional(),
    area: optText(120),
    checkin: isoDate.optional(),
    checkout: isoDate.optional(),
    totalPrice: z.number().int().min(0).max(10_000_000).optional(), // whole group, all nights
    reference: optText(80),
    link: optUrl,
  })
  .refine((v) => v.optionId || (v.name && v.totalPrice != null), { message: 'Pick the suggested stay or enter the name and total price' })

/** "I booked my travel": the suggested option or something else, for one starting city. */
export const TravelBookingSchema = z
  .object({
    optionId: z.string().min(1).max(80).nullable(),
    mode: z.enum(['flight', 'train', 'bus', 'car']).optional(),
    label: z.string().trim().min(2).max(120).optional(), // e.g. "6E 5123" or "Konkan Kanya Express"
    pricePerPersonReturn: z.number().int().min(0).max(1_000_000).optional(),
    arriveTime: hhmmTime.nullable().optional(), // at the destination on day 1
    returnDepartTime: hhmmTime.nullable().optional(), // leaving on the last day
    reference: optText(80),
    link: optUrl,
  })
  .refine((v) => v.optionId || (v.mode && v.label && v.pricePerPersonReturn != null), {
    message: 'Pick the suggested option or enter mode, name and price',
  })

export type StayBookingInput = z.infer<typeof StayBookingSchema>
export type TravelBookingInput = z.infer<typeof TravelBookingSchema>
export type CreateTripInput = z.infer<typeof CreateTripSchema>
export type JoinInput = z.infer<typeof JoinSchema>
