/** Reading a plan: apply swaps, add up costs, count votes. Used by the API and every client. */
import type { Activity, PlanDay, PlanDocument, Stay, TransportOption, Vote } from './types'

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

/** Per-person, all-in cost of a plan with a given stay and transport. */
export function costBreakdown(
  doc: Pick<PlanDocument, 'foodPerDay'>,
  days: { items: Pick<Activity, 'cost' | 'travel'>[] }[],
  stay: Pick<Stay, 'pricePerNight'>,
  transport: Pick<TransportOption, 'price'>,
): Costs {
  const items = days.flatMap((d) => d.items)
  const nights = Math.max(1, days.length - 1)
  const parts = {
    travel: transport.price * 2,
    stay: stay.pricePerNight * nights,
    food: doc.foodPerDay * days.length,
    activities: items.reduce((s, a) => s + a.cost, 0),
    local: items.reduce((s, a) => s + (a.travel?.cost ?? 0), 0),
  }
  return { ...parts, total: Object.values(parts).reduce((a, b) => a + b, 0), nights }
}

/** Best stay that fits, then the fastest travel that keeps `headroom` under the budget. */
export function pickStayAndTransport(
  doc: Pick<PlanDocument, 'foodPerDay' | 'stays' | 'transports'>,
  days: { items: Pick<Activity, 'cost' | 'travel'>[] }[],
  budget: number,
  headroom = 0.95,
): { stay: Stay; transport: TransportOption; fits: boolean } {
  const staysDesc = [...doc.stays].sort((a, b) => b.pricePerNight - a.pricePerNight)
  for (const stay of staysDesc) {
    for (const transport of doc.transports) {
      if (costBreakdown(doc, days, stay, transport).total <= budget * headroom) return { stay, transport, fits: true }
    }
  }
  return {
    stay: staysDesc[staysDesc.length - 1],
    transport: [...doc.transports].sort((a, b) => a.price - b.price)[0],
    fits: false,
  }
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
