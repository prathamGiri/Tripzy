import { describe, expect, it } from 'vitest'
import { computeOverlap } from './overlap'
import { agreement, applySwaps, costBreakdown, pickStayAndTransport } from './plan'
import type { PlanDay, Preferences } from './types'

const p = (budget: number, dates: string[], extra: Partial<Preferences> = {}): Preferences => ({
  budget, style: 'relaxed', interests: ['food'], food: [], dates, ...extra,
})

describe('computeOverlap', () => {
  const window = { windowStart: '2026-12-10', windowEnd: '2026-12-16', days: 3 }
  it('finds the run of days where the most people are free', () => {
    const ov = computeOverlap(
      [p(20000, ['2026-12-12', '2026-12-13', '2026-12-14', '2026-12-15']), p(30000, ['2026-12-13', '2026-12-14', '2026-12-15', '2026-12-16'])],
      window,
    )
    expect(ov.best).toEqual({ dates: ['2026-12-13', '2026-12-14', '2026-12-15'], free: 2 })
    expect(ov.budget).toEqual({ min: 20000, max: 30000, median: 25000 })
  })
  it('counts interests, styles and food', () => {
    const ov = computeOverlap([p(1, ['2026-12-10'], { interests: ['food', 'beaches'], style: 'party', food: ['Vegetarian'] }), p(1, ['2026-12-10']), p(1, ['2026-12-10'])], window)
    expect(ov.interests[0]).toEqual({ key: 'food', count: 3 })
    expect(ov.dominantStyle).toBe('relaxed')
    expect(ov.food).toEqual([{ key: 'Vegetarian', count: 1 }])
  })
  it('handles nobody having answered', () => {
    const ov = computeOverlap([], window)
    expect(ov.respondedCount).toBe(0)
    expect(ov.budget.min).toBe(0)
  })
})

const days: PlanDay[] = [
  { date: '2026-12-16', title: 'A', items: [{ id: 'd1-i1', time: '10:00', emoji: '🏖️', title: 'Beach', place: 'X', cost: 500, tags: ['beaches'], why: '', travel: { mode: 'Cab', mins: 10, cost: 100 }, alts: [{ id: 'd1-i1-a1', emoji: '🛶', title: 'Kayak', place: 'Y', cost: 900, tags: ['nature'], why: '' }] }] },
  { date: '2026-12-17', title: 'B', items: [] },
]

describe('plan maths', () => {
  const doc = {
    foodPerDay: 1000,
    stays: [
      { id: 's1', pricePerNight: 1000 },
      { id: 's2', pricePerNight: 5000 },
    ],
    transports: [
      { id: 't1', price: 4000 },
      { id: 't2', price: 1000 },
    ],
  } as never

  it('adds up travel, stay, food, activities and local transport', () => {
    expect(costBreakdown(doc, days, { pricePerNight: 1000 }, { price: 1000 })).toMatchObject({
      travel: 2000, stay: 1000, food: 2000, activities: 500, local: 100, total: 5600, nights: 1,
    })
  })
  it('applies swaps', () => {
    const r = applySwaps(days, { 'd1-i1': 'd1-i1-a1' })
    expect(r[0].items[0]).toMatchObject({ id: 'd1-i1-a1', slotId: 'd1-i1', swapped: true, cost: 900, time: '10:00' })
  })
  it('picks the best stay, then the fastest travel that fits the budget', () => {
    // 5000-stay + fastest (4000×2) = 15600 (too much); 5000-stay + cheap travel = 9600 ≤ 11k × 0.95
    expect(pickStayAndTransport(doc, days, 11000)).toMatchObject({ stay: { id: 's2' }, transport: { id: 't2' }, fits: true })
  })
  it('falls back to the cheapest combo when nothing fits', () => {
    expect(pickStayAndTransport(doc, days, 1000)).toMatchObject({ stay: { id: 's1' }, transport: { id: 't2' }, fits: false })
  })
  it('measures agreement', () => {
    expect(agreement({ a: { m1: 'up', m2: 'down' }, b: { m1: 'down', m2: 'down' } }, ['a', 'b', 'c'])).toBe(50)
  })
})
