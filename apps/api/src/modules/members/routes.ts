/** Invites (join without sign-up) and saving each member's preferences. */
import type { FastifyInstance } from 'fastify'
import { AVATAR_COLORS, dateRange, JoinSchema, PreferencesSchema, type InvitePreview, type MemberToken } from '@tripzy/shared'
import { requireMember } from '../../lib/auth'
import { db, toJson } from '../../lib/db'
import { HttpError, notFound, parse } from '../../lib/http'
import { newToken } from '../../lib/ids'
import { assertNotLocked } from '../trips/service'
import { tripView } from '../trips/view'

const MAX_MEMBERS = 20

async function tripByCode(code: string) {
  const trip = await db.trip.findUnique({
    where: { inviteCode: code.toLowerCase() },
    include: { members: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
  })
  if (!trip) throw notFound('This invite link is not valid')
  return trip
}

export async function memberRoutes(app: FastifyInstance) {
  app.get<{ Params: { code: string } }>('/invites/:code', async (req): Promise<InvitePreview> => {
    const trip = await tripByCode(req.params.code)
    const organizer = trip.members.find((m) => m.isOrganizer)
    return {
      code: trip.inviteCode,
      tripId: trip.id,
      tripName: trip.name,
      organizerName: organizer?.name ?? 'Your friend',
      destinationQuery: trip.destinationQuery,
      windowStart: trip.windowStart,
      windowEnd: trip.windowEnd,
      days: trip.days,
      groupSize: trip.groupSize,
      memberCount: trip.members.length,
      respondedCount: trip.members.filter((m) => m.prefs).length,
      members: trip.members.map((m) => ({ name: m.name, color: m.color })),
    }
  })

  app.post<{ Params: { code: string } }>('/invites/:code/join', async (req, reply): Promise<MemberToken> => {
    const { name } = parse(JoinSchema, req.body)
    const trip = await tripByCode(req.params.code)
    if (trip.locked) throw new HttpError(409, 'This trip is already locked')
    if (trip.members.length >= MAX_MEMBERS) throw new HttpError(409, 'This trip is full')
    const member = await db.member.create({
      data: {
        tripId: trip.id,
        name,
        color: AVATAR_COLORS[trip.members.length % AVATAR_COLORS.length],
        token: newToken(),
      },
    })
    reply.code(201)
    return { tripId: trip.id, memberId: member.id, name: member.name, token: member.token }
  })

  app.put<{ Params: { id: string } }>('/trips/:id/members/me/prefs', async (req) => {
    const me = await requireMember(req, req.params.id)
    await assertNotLocked(req.params.id)
    const prefs = parse(PreferencesSchema, req.body)
    const trip = await db.trip.findUniqueOrThrow({ where: { id: req.params.id } })
    const allowed = new Set(dateRange(trip.windowStart, trip.windowEnd))
    prefs.dates = [...new Set(prefs.dates)].filter((d) => allowed.has(d)).sort()
    if (!prefs.dates.length) throw new HttpError(400, 'Pick at least one date inside the trip window')

    const updated = await db.member.update({
      where: { id: me.id },
      data: { prefs: toJson(prefs), respondedAt: new Date() },
    })
    return tripView(req.params.id, updated)
  })
}
