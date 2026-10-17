/**
 * Plan generation runs as a background job so the HTTP request returns at once;
 * clients poll the job for its stage. Jobs live in the database, so status survives page reloads.
 */
import { applySwaps, inr, pickStayAndTransport, costBreakdown, type Preferences } from '@tripzy/shared'
import { env } from '../../config/env'
import { db, toJson } from '../../lib/db'
import { HttpError } from '../../lib/http'
import { applyPriceCheck, assertUsable, getPlanner, toPlanDocument, type PlannerInput } from '../ai'
import { seedDemoVotes } from '../demo/seed'
import { loadTrip, memberPrefs, overlapOf } from '../trips/view'

export const STAGES = {
  queued: 'Waiting to start',
  reading: 'Reading everyone’s preferences',
  planning: 'Planning days, stays and travel',
  budget: 'Fitting everything to the budget',
  prices: 'Checking hotel prices on the web',
  links: 'Adding booking links',
  done: 'Plan ready',
}

export async function startGeneration(tripId: string) {
  const trip = await loadTrip(tripId)
  if (trip.locked) throw new HttpError(409, 'This trip is locked')
  if (trip.members.filter((m) => m.prefs).length < 2) throw new HttpError(400, 'At least 2 people need to share preferences first')

  const running = await db.generationJob.findFirst({ where: { tripId, status: { in: ['queued', 'running'] } } })
  if (running) return running

  const job = await db.generationJob.create({ data: { tripId, status: 'queued', stage: STAGES.queued } })
  void runJob(job.id, tripId) // fire and forget; errors are recorded on the job
  return job
}

async function stage(jobId: string, s: string) {
  await db.generationJob.update({ where: { id: jobId }, data: { status: 'running', stage: s } })
}

async function runJob(jobId: string, tripId: string) {
  try {
    await stage(jobId, STAGES.reading)
    const trip = await loadTrip(tripId)
    const ov = overlapOf(trip)
    const prefs = trip.members.map(memberPrefs).filter((p): p is Preferences => !!p)
    const dates = ov.best?.dates ?? ov.windowDates.slice(0, trip.days)

    const planner = getPlanner()
    const input: PlannerInput = {
      destinationQuery: trip.destinationQuery,
      origin: trip.origin,
      dates,
      groupSize: trip.groupSize,
      overlap: ov,
      people: prefs.map(({ style, interests, food }) => ({ style, interests, food })),
    }
    const ctx = {
      origin: trip.origin,
      dates,
      groupSize: trip.groupSize,
      generatedWith: prefs.length,
      source: planner.name === 'openai' ? ('ai' as const) : ('mock' as const),
      model: planner.model,
      affiliates: env.affiliates,
    }
    const budget = ov.budget.min || 20000

    await stage(jobId, STAGES.planning)
    let doc = toPlanDocument(await planner.generate(input), ctx)
    assertUsable(doc)

    await stage(jobId, STAGES.budget)
    let pick = pickStayAndTransport(doc, doc.days, budget)
    if (!pick.fits && planner.name === 'openai') {
      // One retry with concrete feedback; the AI's own maths is never trusted, we recompute.
      const cheapest = costBreakdown(doc, doc.days, pick.stay, pick.transport).total
      await stage(jobId, `${STAGES.budget} (second pass)`)
      const retry = toPlanDocument(
        await planner.generate({
          ...input,
          feedback: `Your previous plan cost at least ${inr(cheapest)} per person, above the tightest budget of ${inr(budget)}. Choose cheaper stays, travel and activities so the total is under ${inr(budget * 0.95)}.`,
        }),
        ctx,
      )
      assertUsable(retry)
      doc = retry
      pick = pickStayAndTransport(doc, doc.days, budget)
    }

    if (planner.checkPrices) {
      // Re-price the stays from the web for these dates; swap any that would break the budget.
      await stage(jobId, STAGES.prices)
      try {
        const nights = Math.max(1, doc.days.length - 1)
        const cheapest = Math.min(...doc.transports.map((t) => t.price))
        const withoutStay = costBreakdown(doc, doc.days, { pricePerNight: 0 }, { price: cheapest }).total
        const check = await planner.checkPrices({
          city: doc.destination.name,
          region: doc.destination.region,
          checkin: doc.dates[0],
          checkout: doc.dates[doc.dates.length - 1],
          nights,
          groupSize: trip.groupSize,
          maxPerPersonPerNight: Math.max(500, Math.round((budget * 0.95 - withoutStay) / nights)),
          stays: doc.stays.map((s) => ({
            name: s.name, area: s.area, tier: s.tier, roomRate: s.roomRate, guestsPerRoom: s.guestsPerRoom, wholeProperty: s.wholeProperty,
          })),
        })
        doc = applyPriceCheck(doc, check, ctx)
      } catch (err) {
        console.warn(`[plans] job ${jobId}: price check failed, keeping AI estimates:`, err)
      }
      pick = pickStayAndTransport(doc, doc.days, budget)
    }

    await stage(jobId, STAGES.links)
    const plan = await db.$transaction(async (tx) => {
      await tx.plan.updateMany({ where: { tripId, isCurrent: true }, data: { isCurrent: false } })
      const version = (await tx.plan.count({ where: { tripId } })) + 1
      return tx.plan.create({
        data: { tripId, version, source: doc.source, document: toJson(doc), stayId: pick.stay.id, transportId: pick.transport.id },
      })
    })

    if (env.demoMode) await seedDemoVotes(trip, plan.id, applySwaps(doc.days, {}), pick.stay.id)

    await db.generationJob.update({ where: { id: jobId }, data: { status: 'done', stage: STAGES.done, planId: plan.id } })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[plans] job ${jobId} failed:`, err)
    await db.generationJob.update({ where: { id: jobId }, data: { status: 'failed', stage: 'Failed', error: message } }).catch(() => {})
  }
}

/** Jobs that were running when the server stopped will never finish; mark them failed on boot. */
export async function failOrphanedJobs() {
  await db.generationJob.updateMany({
    where: { status: { in: ['queued', 'running'] } },
    data: { status: 'failed', stage: 'Failed', error: 'The server restarted while planning. Please try again.' },
  })
}
