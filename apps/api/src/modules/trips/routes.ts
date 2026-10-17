import type { FastifyInstance } from 'fastify'
import { CreateTripSchema } from '@tripzy/shared'
import { requireMember, requireOrganizer } from '../../lib/auth'
import { parse } from '../../lib/http'
import { createTrip, lockTrip } from './service'
import { tripView } from './view'

export async function tripRoutes(app: FastifyInstance) {
  /** Create a trip. Returns the organizer's view and their secret token. */
  app.post('/trips', async (req, reply) => {
    const input = parse(CreateTripSchema, req.body)
    const { trip, organizer } = await createTrip(input)
    reply.code(201)
    return { trip: await tripView(trip.id, organizer), token: organizer.token }
  })

  app.get<{ Params: { id: string } }>('/trips/:id', async (req) => {
    const me = await requireMember(req, req.params.id)
    return tripView(req.params.id, me)
  })

  app.post<{ Params: { id: string } }>('/trips/:id/lock', async (req) => {
    const me = await requireOrganizer(req, req.params.id)
    await lockTrip(req.params.id)
    return tripView(req.params.id, me)
  })
}
