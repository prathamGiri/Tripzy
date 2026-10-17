import type { FastifyInstance } from 'fastify'
import type { GenerationJob } from '@prisma/client'
import { normalizeOrigin, SelectSchema, travelOptions, type JobStatus, type JobView } from '@tripzy/shared'
import { requireMember, requireOrganizer } from '../../lib/auth'
import { db, fromJson, toJson } from '../../lib/db'
import { HttpError, notFound, parse } from '../../lib/http'
import { assertNotLocked } from '../trips/service'
import { canEditTravel, loadTrip, memberOrigin, toPlanView, tripView } from '../trips/view'
import { markStale, startAdjust, startGeneration } from './service'

const jobView = (j: GenerationJob): JobView => ({ id: j.id, status: j.status as JobStatus, stage: j.stage, error: j.error })

export async function planRoutes(app: FastifyInstance) {
  /** Start (re)generating the plan. Organizer only. */
  app.post<{ Params: { id: string } }>('/trips/:id/plans', async (req, reply) => {
    await requireOrganizer(req, req.params.id)
    reply.code(202)
    return jobView(await startGeneration(req.params.id))
  })

  app.get<{ Params: { id: string; jobId: string } }>('/trips/:id/plans/jobs/:jobId', async (req) => {
    await requireMember(req, req.params.id)
    const job = await db.generationJob.findUnique({ where: { id: req.params.jobId } })
    if (!job || job.tripId !== req.params.id) throw notFound('Job not found')
    return jobView(job)
  })

  /**
   * Change the chosen stay (organizer) or a city's travel (organizer, or the only person travelling from that city).
   * Marks the itinerary out of date so someone can tap "Update itinerary".
   */
  app.patch<{ Params: { id: string } }>('/trips/:id/plan', async (req) => {
    const me = await requireMember(req, req.params.id)
    await assertNotLocked(req.params.id)
    const sel = parse(SelectSchema, req.body)
    const trip = await loadTrip(req.params.id)
    const row = trip.plans[0]
    if (!row) throw notFound('No plan yet')
    const view = toPlanView(row, trip)
    const changes = fromJson<{ stay?: unknown; travel?: Record<string, unknown> }>(row.changes) ?? {}
    const now = new Date().toISOString()
    const data: { stayId?: string; transportIds?: string; changes?: string } = {}
    let reason = ''

    if (sel.stayId) {
      if (!me.isOrganizer) throw new HttpError(403, 'Only the organizer can change the stay')
      if (view.bookings.stay) throw new HttpError(409, 'The stay is already booked — remove the booking to change it')
      const stay = view.doc.stays.find((s) => s.id === sel.stayId)
      if (!stay) throw new HttpError(400, 'Unknown stay')
      data.stayId = stay.id
      changes.stay = { memberId: me.id, at: now }
      reason = `Stay changed to ${stay.name} (${stay.area})`
    }

    if (sel.transportId) {
      const origin = normalizeOrigin(sel.origin ?? memberOrigin(me, trip))
      if (!canEditTravel(me, origin, trip)) throw new HttpError(403, `Only the organizer can choose travel from ${origin}`)
      if (view.bookings.travel[origin]) throw new HttpError(409, `Travel from ${origin} is already booked — remove the booking to change it`)
      const option = travelOptions(view.doc, origin).find((o) => o.id === sel.transportId)
      if (!option) throw new HttpError(400, 'Unknown travel option')
      data.transportIds = toJson({ ...view.transportIds, [origin]: option.id })
      changes.travel = { ...(changes.travel ?? {}), [origin]: { memberId: me.id, at: now } }
      reason = [reason, `Travel from ${origin} changed to ${option.label}`].filter(Boolean).join('; ')
    }

    if (!reason) throw new HttpError(400, 'Nothing to change')
    data.changes = toJson(changes)
    await db.plan.update({ where: { id: row.id }, data })
    await markStale(row.id, reason)
    return tripView(req.params.id, me)
  })

  /** Re-time the itinerary around the current stay and travel. Anyone who can change stay or travel may run it. */
  app.post<{ Params: { id: string } }>('/trips/:id/plan/adjust', async (req, reply) => {
    const me = await requireMember(req, req.params.id)
    const view = await tripView(req.params.id, me)
    if (!view.me.canEditStay && !view.me.editableOrigins.length) throw new HttpError(403, 'Only the organizer can update the itinerary')
    reply.code(202)
    return jobView(await startAdjust(req.params.id))
  })
}
