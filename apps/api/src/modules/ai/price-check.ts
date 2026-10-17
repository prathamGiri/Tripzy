/**
 * Shape of the hotel price check: each planned stay re-priced from the web for the trip dates,
 * with the exact property pages where they were found. Planners that can search the web implement
 * `Planner.checkPrices` and return this.
 */
import { z } from 'zod'

export const PriceCheckSchema = z.object({
  stays: z.array(
    z.object({
      originalName: z.string().describe('The name you were asked to check, unchanged'),
      replaced: z.boolean().describe('true if you swapped this stay for a different property'),
      found: z.boolean().describe('true if you found a current listing with a price for this property'),
      name: z.string().describe('Exact property name as listed on MakeMyTrip or Booking.com'),
      area: z.string(),
      kind: z.string().describe('Property type only, e.g. "Heritage haveli hotel" — never the tier'),
      emoji: z.string(),
      roomRatePerNight: z.number().describe('INR per room per night incl. taxes for these dates (or whole property if wholeProperty)'),
      guestsPerRoom: z.number(),
      wholeProperty: z.boolean(),
      rating: z.number().nullable().describe('Guest rating out of 5 (convert /10 scores), or null'),
      makemytripUrl: z.string().nullable().describe('The property page on makemytrip.com/hotels/...-details-....html if found, else null'),
      bookingUrl: z.string().nullable().describe('The property page on booking.com/hotel/in/....html if found, else null'),
      sourceUrls: z.array(z.string()).describe('Pages the price came from'),
      note: z.string().describe('One short line on the price, e.g. "Mid-Dec on MakeMyTrip: ₹9,800–12,500 per room incl. taxes"'),
      why: z.string().nullable().describe('If replaced: one sentence to the group on why this stay suits them (no mention of limits or replacing); else null'),
      perks: z.array(z.string()).nullable().describe('If replaced: 2-4 perks; else null'),
    }),
  ),
})

export type PriceCheck = z.infer<typeof PriceCheckSchema>

export interface PriceCheckInput {
  city: string
  region: string
  checkin: string
  checkout: string
  nights: number
  groupSize: number
  /** Most a stay can cost per person per night and still keep the trip within the tightest budget. */
  maxPerPersonPerNight: number
  stays: { name: string; area: string; tier: string; roomRate: number; guestsPerRoom: number; wholeProperty: boolean }[]
}
