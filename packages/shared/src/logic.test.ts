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
  it('groups people by starting city', () => {
    const ov = computeOverlap([p(1, ['2026-12-10'], { origin: 'delhi' }), p(1, ['2026-12-10']), p(1, ['2026-12-10'], { origin: 'Already there' })], { ...window, origin: 'Mumbai' })
    expect(ov.origins).toEqual(expect.arrayContaining([{ key: 'Delhi', count: 1 }, { key: 'Mumbai', count: 1 }, { key: 'Already there', count: 1 }]))
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
    travel: [
      { origin: 'Mumbai', options: [{ id: 't1', price: 4000 }, { id: 't2', price: 1000 }] },
      { origin: 'Delhi', options: [{ id: 'd1', price: 6000 }, { id: 'd2', price: 2000 }] },
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
  it("picks the best stay, then each city's fastest travel that fits that city's tightest budget", () => {
    // Mumbai: 5000-stay + t2 (1000×2) = 9600 ≤ 11k × 0.95. Delhi: 5000-stay + d1 (6000×2) = 19600 ≤ 21k × 0.95
    expect(pickStayAndTransport(doc, days, [{ origin: 'Mumbai', minBudget: 11000 }, { origin: 'Delhi', minBudget: 21000 }])).toEqual({
      stay: expect.objectContaining({ id: 's2' }),
      transportIds: { Mumbai: 't2', Delhi: 'd1' },
      fits: true,
    })
  })
  it('drops to a cheaper stay when one city cannot afford the better one', () => {
    // Delhi with 9000: 5000-stay + d2 = 11600 > 8550, 1000-stay + d2 = 7600 ✓
    expect(pickStayAndTransport(doc, days, [{ origin: 'Mumbai', minBudget: 11000 }, { origin: 'Delhi', minBudget: 9000 }])).toMatchObject({
      stay: { id: 's1' }, transportIds: { Mumbai: 't2', Delhi: 'd2' }, fits: true,
    })
  })
  it('people already at the destination need no travel', () => {
    expect(costBreakdown(doc, days, { pricePerNight: 1000 }, null).travel).toBe(0)
  })
  it('falls back to the cheapest combo when nothing fits', () => {
    expect(pickStayAndTransport(doc, days, [{ origin: 'Mumbai', minBudget: 1000 }])).toMatchObject({
      stay: { id: 's1' }, transportIds: { Mumbai: 't2', Delhi: 'd2' }, fits: false,
    })
  })
  it('measures agreement', () => {
    expect(agreement({ a: { m1: 'up', m2: 'down' }, b: { m1: 'down', m2: 'down' } }, ['a', 'b', 'c'])).toBe(50)
  })
})
