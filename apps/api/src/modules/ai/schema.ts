/**
 * The shape every planner (OpenAI or mock) must return.
 * It is sent to OpenAI as a Structured Outputs JSON schema, so keep it to plain objects, arrays,
 * enums and nullable fields (no min/max/regex — those are checked in code afterwards).
 */
import { z } from 'zod'
import { TAG_IDS } from '@tripzy/shared'

const Tag = z.enum(TAG_IDS)

const AiAlternative = z.object({
  emoji: z.string().describe('One emoji for the activity'),
  title: z.string(),
  place: z.string().describe('Neighbourhood or landmark name'),
  costPerPerson: z.number().describe('Entry/activity cost per person in INR, 0 if free. Excludes meals.'),
  tags: z.array(Tag),
  why: z.string().describe('One sentence on why this suits this specific group'),
})

const AiActivity = AiAlternative.extend({
  time: z.string().describe('24h start time, HH:MM'),
  travelFromPrevious: z
    .object({
      mode: z.string().describe('e.g. "Scooter", "Shared cab", "Walk", "Auto"'),
      minutes: z.number(),
      costPerPerson: z.number(),
    })
    .nullable()
    .describe('How the group gets here from the previous item (or from the stay for the first item). null if nothing to add.'),
  alternatives: z.array(AiAlternative).describe('1-2 swap options for the same time slot; [] for pure logistics'),
})

export const AiPlanSchema = z.object({
  destination: z.object({
    name: z.string().describe('City or region, e.g. "Goa"'),
    region: z.string().describe('Base area, e.g. "North Goa · Anjuna & Vagator base"'),
    emoji: z.string(),
    tagline: z.string().describe('Under 8 words'),
  }),
  days: z.array(
    z.object({
      title: z.string().describe('Short theme for the day'),
      items: z.array(AiActivity),
    }),
  ),
  stays: z
    .array(
      z.object({
        name: z.string().describe('Name of a real, bookable property'),
        area: z.string(),
        kind: z.string().describe('e.g. "Private villa", "Hostel · private room", "Boutique hotel"'),
        emoji: z.string(),
        tier: z.enum(['budget', 'mid', 'premium']),
        roomRatePerNight: z
          .number()
          .describe('INR the property charges per room per night INCLUDING taxes, for these exact dates/season (or for the whole property if wholeProperty)'),
        guestsPerRoom: z.number().describe('Adults per room: 2 for normal hotel rooms, 3-4 for family/dorm rooms'),
        wholeProperty: z.boolean().describe('true for villas/apartments booked as one unit for the whole group'),
        rating: z.number().nullable().describe('Typical guest rating out of 5, or null if unknown'),
        perks: z.array(z.string()),
        why: z.string(),
      }),
    )
    .describe('Exactly three: one budget, one mid, one premium'),
  transports: z
    .array(
      z.object({
        mode: z.enum(['flight', 'train', 'bus', 'car']),
        label: z.string().describe('e.g. "Konkan Kanya Express · 3AC" or "Non-stop flight BOM → GOX"'),
        duration: z.string(),
        departTime: z.string().describe('HH:MM'),
        pricePerPersonOneWay: z.number(),
        note: z.string(),
      }),
    )
    .describe('2-3 realistic ways to get from the origin city to the destination, fastest first'),
  foodPerDayPerPerson: z.number().describe('Typical INR per person per day for all meals at the planned places'),
  tips: z.array(z.string()).describe('2-4 short practical tips for this group'),
})

export type RawPlan = z.infer<typeof AiPlanSchema>
