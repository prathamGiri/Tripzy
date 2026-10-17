/** Endpoints that only exist when DEMO_MODE=true: switching between people and the one-click sample trip. */
import type { FastifyInstance } from 'fastify'
import { toISO, type MemberToken, type Preferences } from '@tripzy/shared'
import { requireMember } from '../../lib/auth'
import { db, toJson } from '../../lib/db'
import { createTrip } from '../trips/service'

export async function demoRoutes(app: FastifyInstance) {
  /** Every member's token for a trip you belong to, so one person can demo the whole group. */
  app.get<{ Params: { id: string } }>('/demo/trips/:id/tokens', async (req): Promise<MemberToken[]> => {
    await requireMember(req, req.params.id)
    const members = await db.member.findMany({ where: { tripId: req.params.id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })
    return members.map((m) => ({ tripId: m.tripId, memberId: m.id, name: m.name, token: m.token }))
  })

  /** A ready-to-generate Goa trip where everyone has answered. */
  app.post('/demo/sample-trip', async (_req, reply) => {
    const d = new Date()
    const start = new Date(d.getFullYear(), d.getMonth() + 2, 12)
    const end = new Date(d.getFullYear(), d.getMonth() + 2, 22)
    const { trip, organizer } = await createTrip({
      name: 'Goa with the gang',
      organizerName: 'Arjun',
      destinationQuery: 'Goa',
      origin: 'Mumbai',
      windowStart: toISO(start),
      windowEnd: toISO(end),
      days: 4,
      groupSize: 6,
      seedDemoFriends: true,
    })
    // Fill in the organizer and anyone still pending.
    const window = Array.from({ length: 8 }, (_, i) => toISO(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 2 + i)))
    const fill: Preferences[] = [
      { budget: 22000, style: 'relaxed', interests: ['beaches', 'food', 'nightlife'], food: [], dates: window, origin: 'Mumbai', completedInSec: 58 },
      { budget: 24000, style: 'party', interests: ['nightlife', 'beaches', 'wellness'], food: [], dates: window, origin: 'Pune', completedInSec: 66 },
      { budget: 26000, style: 'adventure', interests: ['nature', 'adventure', 'food'], food: ['Vegetarian'], dates: window, origin: 'Mumbai', completedInSec: 71 },
    ]
    const pending = await db.member.findMany({ where: { tripId: trip.id, prefs: null }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })
    for (const [i, m] of pending.entries()) {
      await db.member.update({ where: { id: m.id }, data: { prefs: toJson(fill[i % fill.length]), respondedAt: new Date() } })
    }
    const members = await db.member.findMany({ where: { tripId: trip.id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })
    reply.code(201)
    return {
      tripId: trip.id,
      organizerId: organizer.id,
      tokens: members.map((m) => ({ tripId: m.tripId, memberId: m.id, name: m.name, token: m.token })),
    }
  })
}
