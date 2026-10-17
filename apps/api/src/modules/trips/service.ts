import { AVATAR_COLORS, type CreateTripInput } from '@tripzy/shared'
import { env } from '../../config/env'
import { db } from '../../lib/db'
import { HttpError } from '../../lib/http'
import { newInviteCode, newToken } from '../../lib/ids'
import { demoFriends } from '../demo/seed'

export async function createTrip(input: CreateTripInput) {
  const seed = env.demoMode && input.seedDemoFriends
  const now = Date.now()

  return db.$transaction(async (tx) => {
    const trip = await tx.trip.create({
      data: {
        name: input.name,
        destinationQuery: input.destinationQuery,
        origin: input.origin,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        days: input.days,
        groupSize: input.groupSize,
        inviteCode: newInviteCode(input.destinationQuery ?? input.name),
      },
    })
    const organizer = await tx.member.create({
      data: {
        tripId: trip.id,
        name: input.organizerName,
        color: AVATAR_COLORS[0],
        isOrganizer: true,
        token: newToken(),
        createdAt: new Date(now),
      },
    })
    if (seed) {
      const friends = demoFriends(input)
      for (const [i, f] of friends.entries()) {
        await tx.member.create({ data: { ...f, tripId: trip.id, token: newToken(), createdAt: new Date(now + i + 1) } })
      }
    }
    return { trip, organizer }
  })
}

export async function lockTrip(tripId: string) {
  const plan = await db.plan.findFirst({ where: { tripId, isCurrent: true } })
  if (!plan) throw new HttpError(409, 'Generate a plan before locking the trip')
  await db.trip.update({ where: { id: tripId }, data: { locked: true } })
}

export async function assertNotLocked(tripId: string) {
  const trip = await db.trip.findUnique({ where: { id: tripId }, select: { locked: true } })
  if (trip?.locked) throw new HttpError(409, 'This trip is locked')
}
