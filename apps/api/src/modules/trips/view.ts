/** Builds the TripView a member sees: trip, members (no individual budgets), overlap and current plan. */
import type { Member } from '@prisma/client'
import {
  applySwaps,
  computeOverlap,
  costBreakdown,
  type MemberView,
  type PlanDocument,
  type PlanView,
  type Preferences,
  type TripView,
  type Vote,
} from '@tripzy/shared'
import { env } from '../../config/env'
import { db, fromJson } from '../../lib/db'
import { notFound } from '../../lib/http'

export async function loadTrip(tripId: string) {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: {
      members: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
      plans: { where: { isCurrent: true }, include: { votes: true, swaps: true }, take: 1 },
    },
  })
  if (!trip) throw notFound('Trip not found')
  return trip
}

export type LoadedTrip = Awaited<ReturnType<typeof loadTrip>>

export const memberPrefs = (m: Pick<Member, 'prefs'>) => fromJson<Preferences>(m.prefs)

export function overlapOf(trip: LoadedTrip) {
  const prefs = trip.members.map(memberPrefs).filter((p): p is Preferences => !!p)
  return computeOverlap(prefs, trip)
}

export function toTripView(trip: LoadedTrip, viewer: Member): TripView {
  const prefsList = trip.members.map(memberPrefs).filter((p): p is Preferences => !!p)
  const overlap = computeOverlap(prefsList, trip)

  const members: MemberView[] = trip.members.map((m) => {
    const p = memberPrefs(m)
    return {
      id: m.id,
      name: m.name,
      color: m.color,
      isOrganizer: m.isOrganizer,
      responded: !!p,
      respondedAt: m.respondedAt?.toISOString() ?? null,
      style: p?.style ?? null,
      interests: p?.interests ?? [],
      completedInSec: p?.completedInSec ?? null,
    }
  })

  let plan: PlanView | null = null
  let budgetFit: TripView['budgetFit'] = null
  const row = trip.plans[0]
  if (row) {
    const doc = upgradeDoc(fromJson<PlanDocument>(row.document)!, trip.groupSize)
    const votes: PlanView['votes'] = {}
    for (const v of row.votes) (votes[v.itemId] ??= {})[v.memberId] = v.value as Vote
    const swaps = Object.fromEntries(row.swaps.map((s) => [s.slotId, s.altId]))
    plan = { id: row.id, version: row.version, doc, stayId: row.stayId, transportId: row.transportId, votes, swaps }

    const stay = doc.stays.find((s) => s.id === row.stayId) ?? doc.stays[0]
    const transport = doc.transports.find((t) => t.id === row.transportId) ?? doc.transports[0]
    const total = costBreakdown(doc, applySwaps(doc.days, swaps), stay, transport).total
    budgetFit = { fits: prefsList.filter((p) => p.budget >= total).length, of: prefsList.length }
  }

  return {
    id: trip.id,
    name: trip.name,
    destinationQuery: trip.destinationQuery,
    origin: trip.origin,
    windowStart: trip.windowStart,
    windowEnd: trip.windowEnd,
    days: trip.days,
    groupSize: trip.groupSize,
    inviteCode: trip.inviteCode,
    locked: trip.locked,
    members,
    overlap,
    plan,
    budgetFit,
    me: { memberId: viewer.id, isOrganizer: viewer.isOrganizer, prefs: memberPrefs(viewer) },
    demo: env.demoMode,
  }
}

/** Plans saved before room-based pricing existed: fill in the new fields so old trips keep working. */
function upgradeDoc(doc: PlanDocument, groupSize: number): PlanDocument {
  if (doc.stays.every((s) => s.roomRate != null)) return doc
  return {
    ...doc,
    pricesCheckedAt: doc.pricesCheckedAt ?? null,
    stays: doc.stays.map((s) =>
      s.roomRate != null
        ? s
        : { ...s, roomRate: s.pricePerNight * 2, rooms: Math.ceil(groupSize / 2), guestsPerRoom: 2, wholeProperty: false, priceSource: 'estimate', priceNote: null, sources: [] },
    ),
  }
}

export async function tripView(tripId: string, viewer: Member) {
  return toTripView(await loadTrip(tripId), viewer)
}
