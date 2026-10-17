/** Demo-mode helpers: pre-filled friends and their automatic votes, so a solo demo feels like a real group. */
import type { Prisma } from '@prisma/client'
import { AVATAR_COLORS, dateRange, type CreateTripInput, type Preferences, type ResolvedDay } from '@tripzy/shared'
import { db, toJson } from '../../lib/db'
import type { LoadedTrip } from '../trips/view'
import { memberPrefs } from '../trips/view'

const FRIENDS = ['Aisha', 'Rohan', 'Meera', 'Kabir', 'Neha', 'Vikram', 'Isha', 'Dev', 'Tara', 'Sameer', 'Zoya']

/** Answers for the first few friends; dates are fractions of the trip window. */
const SEEDED: (Omit<Preferences, 'dates'> & { from: number; to: number; minsAgo: number })[] = [
  { budget: 25000, style: 'party', interests: ['beaches', 'nightlife', 'food', 'photography'], food: [], origin: 'Mumbai', from: 0.25, to: 1, minsAgo: 12, completedInSec: 74 },
  { budget: 30000, style: 'adventure', interests: ['adventure', 'nature', 'nightlife', 'food'], food: ['No seafood'], origin: 'Delhi', from: 0, to: 0.85, minsAgo: 8, completedInSec: 61 },
  { budget: 20000, style: 'culture', interests: ['history', 'food', 'shopping', 'photography'], food: ['Vegetarian'], origin: 'Mumbai', from: 0.4, to: 1, minsAgo: 3, completedInSec: 92 },
]

type SeedMember = Omit<Prisma.MemberUncheckedCreateInput, 'tripId' | 'token'>

export function demoFriends(input: Pick<CreateTripInput, 'groupSize' | 'windowStart' | 'windowEnd'>, fillAll = false): SeedMember[] {
  const window = dateRange(input.windowStart, input.windowEnd)
  const count = Math.max(1, input.groupSize - 1)
  const prefilled = fillAll ? count : Math.min(SEEDED.length, Math.max(1, count - 2))
  return FRIENDS.slice(0, count).map((name, i) => {
    const m: SeedMember = { name, color: AVATAR_COLORS[(i + 1) % AVATAR_COLORS.length], isDemoSeed: true }
    if (i < prefilled) {
      const s = SEEDED[i % SEEDED.length]
      const { from, to, minsAgo, ...rest } = s
      const dates = fillAll ? window.slice(2, Math.max(3, window.length - 1)) : window.slice(Math.floor(window.length * from), Math.ceil(window.length * to))
      m.prefs = toJson({ ...rest, dates } satisfies Preferences)
      m.respondedAt = new Date(Date.now() - minsAgo * 60_000 - i * 1000)
    }
    return m
  })
}

const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Seeded friends vote on a fresh plan: mostly 👍 on things matching their interests, the odd 👎 elsewhere. */
export async function seedDemoVotes(trip: LoadedTrip, planId: string, days: ResolvedDay[], stayId: string) {
  const items = [...days.flatMap((d) => d.items).filter((a) => a.tags.length).map((a) => ({ id: a.id, tags: a.tags as string[] })), { id: stayId, tags: [] as string[] }]
  const rows: Prisma.VoteCreateManyInput[] = []
  for (const m of trip.members) {
    const p = memberPrefs(m)
    if (!m.isDemoSeed || !p) continue
    for (const it of items) {
      const h = hash(m.id + it.id) % 100
      const likes = it.tags.some((t) => (p.interests as string[]).includes(t) || p.style === t)
      const value = h < (likes ? 5 : 35) ? 'down' : h < 80 ? 'up' : null
      if (value) rows.push({ planId, itemId: it.id, memberId: m.id, value })
    }
  }
  if (rows.length) await db.vote.createMany({ data: rows })
}
