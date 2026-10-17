/** 👍/👎 on plan items and swapping an activity for one of its alternatives. */
import type { FastifyInstance } from 'fastify'
import { SwapSchema, VoteSchema, type PlanDocument } from '@tripzy/shared'
import { requireMember } from '../../lib/auth'
import { db, fromJson } from '../../lib/db'
import { HttpError, notFound, parse } from '../../lib/http'
import { assertNotLocked } from '../trips/service'
import { tripView, upgradeDoc } from '../trips/view'

async function currentPlan(tripId: string) {
  const plan = await db.plan.findFirst({ where: { tripId, isCurrent: true } })
  if (!plan) throw notFound('No plan yet')
  const trip = await db.trip.findUniqueOrThrow({ where: { id: tripId }, select: { groupSize: true } })
  return { plan, doc: upgradeDoc(fromJson<PlanDocument>(plan.document)!, trip.groupSize) }
}

export async function voteRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>('/trips/:id/plan/votes', async (req) => {
    const me = await requireMember(req, req.params.id)
    await assertNotLocked(req.params.id)
    const { itemId, value } = parse(VoteSchema, req.body)
    const { plan, doc } = await currentPlan(req.params.id)

    const ids = new Set([
      ...doc.days.flatMap((d) => d.items.flatMap((a) => [a.id, ...a.alts.map((x) => x.id)])),
      ...doc.stays.map((s) => s.id),
      ...doc.travel.flatMap((g) => g.options.map((t) => t.id)),
    ])
    if (!ids.has(itemId)) throw new HttpError(400, 'Unknown plan item')

    const key = { planId_itemId_memberId: { planId: plan.id, itemId, memberId: me.id } }
    if (value === null) await db.vote.deleteMany({ where: { planId: plan.id, itemId, memberId: me.id } })
    else await db.vote.upsert({ where: key, create: { planId: plan.id, itemId, memberId: me.id, value }, update: { value } })
    return tripView(req.params.id, me)
  })

  app.post<{ Params: { id: string } }>('/trips/:id/plan/swaps', async (req) => {
    const me = await requireMember(req, req.params.id)
    await assertNotLocked(req.params.id)
    const { slotId, altId } = parse(SwapSchema, req.body)
    const { plan, doc } = await currentPlan(req.params.id)

    const slot = doc.days.flatMap((d) => d.items).find((a) => a.id === slotId)
    if (!slot) throw new HttpError(400, 'Unknown activity')
    if (altId && !slot.alts.some((x) => x.id === altId)) throw new HttpError(400, 'Unknown alternative')

    await db.$transaction(async (tx) => {
      if (!altId) {
        await tx.swap.deleteMany({ where: { planId: plan.id, slotId } })
      } else {
        await tx.swap.upsert({
          where: { planId_slotId: { planId: plan.id, slotId } },
          create: { planId: plan.id, slotId, altId, memberId: me.id },
          update: { altId, memberId: me.id, at: new Date() },
        })
      }
      // Whoever swaps something in obviously likes it.
      const itemId = altId ?? slotId
      await tx.vote.upsert({
        where: { planId_itemId_memberId: { planId: plan.id, itemId, memberId: me.id } },
        create: { planId: plan.id, itemId, memberId: me.id, value: 'up' },
        update: { value: 'up' },
      })
    })
    return tripView(req.params.id, me)
  })
}
