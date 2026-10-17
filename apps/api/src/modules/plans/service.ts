/**
 * Plan jobs run in the background so HTTP requests return at once; clients poll the job for its stage.
 * - generate: a whole new plan (AI planning → web price check → budget fit → save a new version)
 * - adjust:   re-time the current itinerary after the stay or travel changed (keeps votes and swaps)
 */
import {
  applySwaps,
  costBreakdown,
  effectiveStay,
  effectiveTransport,
  inr,
  LOCAL_ORIGIN,
  pickStayAndTransport,
  travelOptions,
  type Preferences,
} from '@tripzy/shared'
import { env } from '../../config/env'
import { db, fromJson, toJson } from '../../lib/db'
import { HttpError } from '../../lib/http'
import { applyPriceCheck, assertUsable, getPlanner, mergeAdjusted, toPlanDocument, type PlannerInput } from '../ai'
import { seedDemoVotes } from '../demo/seed'
import { groupDefaultOrigin, loadTrip, memberPrefs, overlapOf, toPlanView, travellersByOrigin, type LoadedTrip } from '../trips/view'

export const STAGES = {
  queued: 'Waiting to start',
  reading: 'Reading everyone’s preferences',
  planning: 'Planning days, stays and travel',
  budget: 'Fitting everything to the budget',
  prices: 'Checking hotel prices on the web',
  links: 'Adding booking links',
  adjusting: 'Updating the itinerary',
  done: 'Plan ready',
}

/** One entry per starting city: how many people, and the tightest budget among them. */
function cityGroups(trip: LoadedTrip) {
  return [...travellersByOrigin(trip).entries()].map(([origin, ms]) => ({
    origin,
    people: ms.length,
    minBudget: Math.min(...ms.map((m) => memberPrefs(m)!.budget)),
  }))
}

/* ------------------------------------------------------------------ */
/* Generate                                                            */
/* ------------------------------------------------------------------ */

export async function startGeneration(tripId: string) {
  const trip = await loadTrip(tripId)
  if (trip.locked) throw new HttpError(409, 'This trip is locked')
  if (trip.members.filter((m) => m.prefs).length < 2) throw new HttpError(400, 'At least 2 people need to share preferences first')

  const running = await db.generationJob.findFirst({ where: { tripId, status: { in: ['queued', 'running'] } } })
  if (running) return running

  const job = await db.generationJob.create({ data: { tripId, kind: 'generate', status: 'queued', stage: STAGES.queued } })
  void runGenerate(job.id, tripId) // fire and forget; errors are recorded on the job
  return job
}

async function stage(jobId: string, s: string) {
  await db.generationJob.update({ where: { id: jobId }, data: { status: 'running', stage: s } })
}

async function fail(jobId: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`[plans] job ${jobId} failed:`, err)
  await db.generationJob.update({ where: { id: jobId }, data: { status: 'failed', stage: 'Failed', error: message } }).catch(() => {})
}

async function runGenerate(jobId: string, tripId: string) {
  try {
    await stage(jobId, STAGES.reading)
    const trip = await loadTrip(tripId)
    const ov = overlapOf(trip)
    const prefs = trip.members.map(memberPrefs).filter((p): p is Preferences => !!p)
    const dates = ov.best?.dates ?? ov.windowDates.slice(0, trip.days)
    const groups = cityGroups(trip)
    const travelling = groups.filter((g) => g.origin !== LOCAL_ORIGIN)

    // Bookings belong to the trip and survive regeneration: tell the planner to plan around them.
    const stayBooking = trip.bookings.find((b) => b.kind === 'stay')
    const bookedStay = stayBooking ? fromJson<{ name: string; area: string }>(stayBooking.snapshot) : null
    const booked: PlannerInput['booked'] = {
      stay: bookedStay ? { name: bookedStay.name, area: bookedStay.area } : undefined,
      travel: trip.bookings
        .filter((b) => b.kind === 'travel')
        .map((b) => {
          const t = fromJson<{ label: string; arrive?: string | null; returnDepart?: string | null }>(b.snapshot)!
          return { origin: b.origin, label: t.label, arrive: t.arrive ?? null, returnDepart: t.returnDepart ?? null }
        }),
    }

    const planner = getPlanner()
    const input: PlannerInput = {
      destinationQuery: trip.destinationQuery,
      origins: groups.map(({ origin, people }) => ({ origin, people })),
      booked,
      dates,
      groupSize: trip.groupSize,
      overlap: ov,
      people: prefs.map(({ style, interests, food }) => ({ style, interests, food })),
    }
    const ctx = {
      origin: groupDefaultOrigin(trip),
      origins: travelling.map((g) => g.origin),
      dates,
      groupSize: trip.groupSize,
      generatedWith: prefs.length,
      source: planner.name === 'openai' ? ('ai' as const) : ('mock' as const),
      model: planner.model,
      affiliates: env.affiliates,
    }

    await stage(jobId, STAGES.planning)
    let doc = toPlanDocument(await planner.generate(input), ctx)
    assertUsable(doc)

    await stage(jobId, STAGES.budget)
    let pick = pickStayAndTransport(doc, doc.days, groups)
    if (!pick.fits && planner.name === 'openai') {
      // One retry with concrete feedback; the AI's own maths is never trusted, we recompute.
      const worst = groups
        .map((g) => ({ g, total: costBreakdown(doc, doc.days, pick.stay, travelOptions(doc, g.origin).find((o) => o.id === pick.transportIds[g.origin]) ?? null).total }))
        .sort((a, b) => b.total - b.g.minBudget - (a.total - a.g.minBudget))[0]
      await stage(jobId, `${STAGES.budget} (second pass)`)
      const retry = toPlanDocument(
        await planner.generate({
          ...input,
          feedback: `For people starting from ${worst.g.origin} your previous plan cost at least ${inr(worst.total)} per person, above their tightest budget of ${inr(worst.g.minBudget)}. Choose cheaper stays, travel and activities so everyone's total is under 95% of their budget.`,
        }),
        ctx,
      )
      assertUsable(retry)
      doc = retry
      pick = pickStayAndTransport(doc, doc.days, groups)
    }

    if (planner.checkPrices && !bookedStay) {
      // Re-price the stays from the web for these dates; swap any that would break the budget.
      await stage(jobId, STAGES.prices)
      try {
        const nights = Math.max(1, doc.days.length - 1)
        // The stay allowance is set by the tightest city group (its budget minus its cheapest travel and the rest).
        const allowance = Math.min(
          ...groups.map((g) => {
            const cheapest = [...travelOptions(doc, g.origin)].sort((a, b) => a.price - b.price)[0] ?? null
            return (g.minBudget * 0.95 - costBreakdown(doc, doc.days, { pricePerNight: 0 }, cheapest).total) / nights
          }),
        )
        const check = await planner.checkPrices({
          city: doc.destination.name,
          region: doc.destination.region,
          checkin: doc.dates[0],
          checkout: doc.dates[doc.dates.length - 1],
          nights,
          groupSize: trip.groupSize,
          maxPerPersonPerNight: Math.max(500, Math.round(allowance)),
          stays: doc.stays.map((s) => ({
            name: s.name, area: s.area, tier: s.tier, roomRate: s.roomRate, guestsPerRoom: s.guestsPerRoom, wholeProperty: s.wholeProperty,
          })),
        })
        doc = applyPriceCheck(doc, check, ctx)
      } catch (err) {
        console.warn(`[plans] job ${jobId}: price check failed, keeping AI estimates:`, err)
      }
      pick = pickStayAndTransport(doc, doc.days, groups)
    }

    await stage(jobId, STAGES.links)
    const plan = await db.$transaction(async (tx) => {
      await tx.plan.updateMany({ where: { tripId, isCurrent: true }, data: { isCurrent: false } })
      const version = (await tx.plan.count({ where: { tripId } })) + 1
      return tx.plan.create({
        data: {
          tripId, version, source: doc.source, document: toJson(doc),
          stayId: pick.stay.id, transportIds: toJson(pick.transportIds),
        },
      })
    })

    if (env.demoMode) await seedDemoVotes(trip, plan.id, applySwaps(doc.days, {}), pick.stay.id)

    await db.generationJob.update({ where: { id: jobId }, data: { status: 'done', stage: STAGES.done, planId: plan.id } })
  } catch (err) {
    await fail(jobId, err)
  }
}

/* ------------------------------------------------------------------ */
/* Adjust (after stay / travel changes)                                */
/* ------------------------------------------------------------------ */

/** Mark the itinerary out of date (shows the "Update itinerary" banner). */
export async function markStale(planId: string, reason: string) {
  await db.plan.update({ where: { id: planId }, data: { stale: toJson({ reason, at: new Date().toISOString() }) } })
}

export async function startAdjust(tripId: string) {
  const trip = await loadTrip(tripId)
  const row = trip.plans[0]
  if (!row) throw new HttpError(409, 'Generate a plan first')
  const running = await db.generationJob.findFirst({ where: { tripId, status: { in: ['queued', 'running'] } } })
  if (running) return running

  const job = await db.generationJob.create({ data: { tripId, kind: 'adjust', status: 'queued', stage: STAGES.queued, planId: row.id } })
  void runAdjust(job.id, tripId)
  return job
}

async function runAdjust(jobId: string, tripId: string) {
  try {
    await stage(jobId, STAGES.adjusting)
    const trip = await loadTrip(tripId)
    const row = trip.plans[0]!
    const view = toPlanView(row, trip)
    const doc = view.doc
    const stay = effectiveStay(view)
    const people = new Map(cityGroups(trip).map((g) => [g.origin, g.people]))
    const reason = view.stale?.reason ?? 'Stay or travel changed'

    const raw = await getPlanner().adjust({
      destination: doc.destination.name,
      region: doc.destination.region,
      dates: doc.dates,
      reason,
      stay: { name: stay.name, area: stay.area },
      travel: doc.travel.map((g) => {
        const t = effectiveTransport(view, g.origin)
        return {
          origin: g.origin, people: people.get(g.origin) ?? 0, mode: t?.mode ?? 'none', label: t?.label ?? 'not chosen',
          depart: t?.depart ?? '', arrive: t?.arrive ?? null, returnDepart: t?.returnDepart ?? null, duration: t?.duration ?? '',
        }
      }),
      // Show the itinerary as the group sees it (swaps applied), but with the original ids so votes/swaps stay attached.
      days: applySwaps(doc.days, view.swaps).map((d) => ({
        date: d.date,
        title: d.title,
        items: d.items.map((a) => ({ id: a.slotId, time: a.time, emoji: a.emoji, title: a.title, place: a.place, cost: a.cost, travel: a.travel })),
      })),
    })

    const next = { ...mergeAdjusted(doc, raw), updateNote: raw.summary }
    // Votes and swaps live in their own tables and refer to item ids, which mergeAdjusted keeps.
    await db.plan.update({ where: { id: row.id }, data: { document: toJson(next), stale: null } })
    await db.generationJob.update({ where: { id: jobId }, data: { status: 'done', stage: STAGES.done, planId: row.id } })
  } catch (err) {
    await fail(jobId, err)
  }
}

/** Jobs that were running when the server stopped will never finish; mark them failed on boot. */
export async function failOrphanedJobs() {
  await db.generationJob.updateMany({
    where: { status: { in: ['queued', 'running'] } },
    data: { status: 'failed', stage: 'Failed', error: 'The server restarted while planning. Please try again.' },
  })
}
