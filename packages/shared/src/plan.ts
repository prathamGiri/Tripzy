/** Reading a plan: apply swaps, add up costs, count votes. Used by the API and every client. */
import type { Activity, PlanDay, PlanDocument, PlanView, Stay, TransportOption, Vote } from './types'

export interface ResolvedItem extends Activity {
  slotId: string // the original activity id (what a swap targets)
  swapped: boolean
}

export interface ResolvedDay extends Omit<PlanDay, 'items'> {
  items: ResolvedItem[]
}

export function applySwaps(days: PlanDay[], swaps: Record<string, string>): ResolvedDay[] {
  return days.map((d) => ({
    ...d,
    items: d.items.map((a) => {
      const alt = swaps[a.id] ? a.alts.find((x) => x.id === swaps[a.id]) : undefined
      return alt ? { ...a, ...alt, slotId: a.id, swapped: true } : { ...a, slotId: a.id, swapped: false }
    }),
  }))
}

export interface Costs {
  travel: number
  stay: number
  food: number
  activities: number
  local: number
  total: number
  nights: number
}

/** Per-person, all-in cost of a plan with a given stay and transport (null = already at the destination). */
export function costBreakdown(
  doc: Pick<PlanDocument, 'foodPerDay'>,
  days: { items: Pick<Activity, 'cost' | 'travel'>[] }[],
  stay: Pick<Stay, 'pricePerNight'>,
  transport: Pick<TransportOption, 'price'> | null,
): Costs {
  const items = days.flatMap((d) => d.items)
  const nights = Math.max(1, days.length - 1)
  const parts = {
    travel: (transport?.price ?? 0) * 2,
    stay: stay.pricePerNight * nights,
    food: doc.foodPerDay * days.length,
    activities: items.reduce((s, a) => s + a.cost, 0),
    local: items.reduce((s, a) => s + (a.travel?.cost ?? 0), 0),
  }
  return { ...parts, total: Object.values(parts).reduce((a, b) => a + b, 0), nights }
}

export const travelOptions = (doc: Pick<PlanDocument, 'travel'>, origin: string) =>
  doc.travel.find((g) => g.origin === origin)?.options ?? []

/**
 * Choose the stay and each city's travel: the best stay for which every city group has a travel option
 * that keeps the tightest budget in that group under `headroom`; for each city, the fastest such option.
 * `groups` = one entry per starting city with the lowest budget among people from there.
 */
export function pickStayAndTransport(
  doc: Pick<PlanDocument, 'foodPerDay' | 'stays' | 'travel'>,
  days: { items: Pick<Activity, 'cost' | 'travel'>[] }[],
  groups: { origin: string; minBudget: number }[],
  headroom = 0.95,
): { stay: Stay; transportIds: Record<string, string>; fits: boolean } {
  const staysDesc = [...doc.stays].sort((a, b) => b.pricePerNight - a.pricePerNight)
  for (const stay of staysDesc) {
    const ids: Record<string, string> = {}
    const ok = groups.every((g) => {
      const opts = travelOptions(doc, g.origin)
      if (!opts.length) return costBreakdown(doc, days, stay, null).total <= g.minBudget * headroom
      const t = opts.find((o) => costBreakdown(doc, days, stay, o).total <= g.minBudget * headroom)
      if (t) ids[g.origin] = t.id
      return !!t
    })
    if (ok) return { stay, transportIds: ids, fits: true }
  }
  // Nothing fits everyone: cheapest stay and cheapest travel everywhere.
  const ids: Record<string, string> = {}
  for (const g of doc.travel) {
    const cheapest = [...g.options].sort((a, b) => a.price - b.price)[0]
    if (cheapest) ids[g.origin] = cheapest.id
  }
  return { stay: staysDesc[staysDesc.length - 1], transportIds: ids, fits: false }
}

/* ---------- what actually applies, once bookings and choices are taken into account ---------- */

/** The stay that counts: the booked one if any, else the group's chosen option. */
export function effectiveStay(plan: Pick<PlanView, 'doc' | 'stayId' | 'bookings'>): Stay {
  return plan.bookings.stay?.stay ?? plan.doc.stays.find((s) => s.id === plan.stayId) ?? plan.doc.stays[0]
}

/** The travel that counts for a starting city: booked, else chosen, else the first option. null = no travel needed. */
export function effectiveTransport(plan: Pick<PlanView, 'doc' | 'transportIds' | 'bookings'>, origin: string): TransportOption | null {
  const booked = plan.bookings.travel[origin]?.transport
  if (booked) return booked
  const opts = travelOptions(plan.doc, origin)
  return opts.find((o) => o.id === plan.transportIds[origin]) ?? opts[0] ?? null
}

/** One person's all-in cost, from their starting city. */
export function personalCost(plan: PlanView, origin: string): Costs {
  return costBreakdown(plan.doc, applySwaps(plan.doc.days, plan.swaps), effectiveStay(plan), effectiveTransport(plan, origin))
}

export function tally(votes: Record<string, Vote> | undefined) {
  const v = Object.values(votes ?? {})
  return { up: v.filter((x) => x === 'up').length, down: v.filter((x) => x === 'down').length }
}

/** % of voted-on items where 👍 ≥ 👎. */
export function agreement(votes: Record<string, Record<string, Vote>>, itemIds: string[]) {
  let voted = 0
  let agreed = 0
  for (const id of itemIds) {
    const t = tally(votes[id])
    if (t.up + t.down === 0) continue
    voted++
    if (t.up >= t.down) agreed++
  }
  return voted ? Math.round((agreed / voted) * 100) : 100
}

/** Items people can vote on: every tagged activity (after swaps) plus the chosen stay. */
export function votableIds(days: ResolvedDay[], stayId: string) {
  return [...days.flatMap((d) => d.items).filter((a) => a.tags.length).map((a) => a.id), stayId]
}
