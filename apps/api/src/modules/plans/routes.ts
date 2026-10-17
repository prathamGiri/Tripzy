import type { FastifyInstance } from 'fastify'
import type { GenerationJob } from '@prisma/client'
import { SelectSchema, type JobView, type JobStatus, type PlanDocument } from '@tripzy/shared'
import { requireMember, requireOrganizer } from '../../lib/auth'
import { db, fromJson } from '../../lib/db'
import { HttpError, notFound, parse } from '../../lib/http'
import { assertNotLocked } from '../trips/service'
import { tripView } from '../trips/view'
import { startGeneration } from './service'

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

  /** Change the chosen stay and/or transport for the whole group. */
  app.patch<{ Params: { id: string } }>('/trips/:id/plan', async (req) => {
    const me = await requireMember(req, req.params.id)
    await assertNotLocked(req.params.id)
    const sel = parse(SelectSchema, req.body)
    const plan = await db.plan.findFirst({ where: { tripId: req.params.id, isCurrent: true } })
    if (!plan) throw notFound('No plan yet')
    const doc = fromJson<PlanDocument>(plan.document)!
    if (sel.stayId && !doc.stays.some((s) => s.id === sel.stayId)) throw new HttpError(400, 'Unknown stay')
    if (sel.transportId && !doc.transports.some((t) => t.id === sel.transportId)) throw new HttpError(400, 'Unknown transport')
    await db.plan.update({ where: { id: plan.id }, data: sel })
    return tripView(req.params.id, me)
  })
}
