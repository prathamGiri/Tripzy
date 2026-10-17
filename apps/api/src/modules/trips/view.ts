/** Builds the TripView a member sees: trip, members (no individual budgets), overlap and current plan. */
import type { Booking as BookingRow, GenerationJob, Member, Plan, Swap, Vote as VoteRow } from '@prisma/client'
import {
  computeOverlap,
  normalizeOrigin,
  personalCost,
  type Booking,
  type ChangeInfo,
  type MemberView,
  type PlanDocument,
  type PlanView,
  type Preferences,
  type Stay,
  type TransportOption,
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
      bookings: true,
      jobs: { where: { kind: 'adjust', status: { in: ['queued', 'running'] } }, take: 1 },
    },
  })
  if (!trip) throw notFound('Trip not found')
  return trip
}

export type LoadedTrip = Awaited<ReturnType<typeof loadTrip>>

export const memberPrefs = (m: Pick<Member, 'prefs'>) => fromJson<Preferences>(m.prefs)

/**
 * The group's default starting city (for people who haven't said): the organizer's answer,
 * else the trip's stored default, else the most common answer so far. '' if nobody has said.
 */
export function groupDefaultOrigin(trip: { origin: string; members: Pick<Member, 'prefs' | 'isOrganizer'>[] }): string {
  const org = trip.members.find((m) => m.isOrganizer)
  const orgOrigin = org ? memberPrefs(org)?.origin : undefined
  if (orgOrigin) return normalizeOrigin(orgOrigin)
  if (trip.origin) return normalizeOrigin(trip.origin)
  const counts = new Map<string, number>()
  for (const m of trip.members) {
    const o = memberPrefs(m)?.origin
    if (o) counts.set(normalizeOrigin(o), (counts.get(normalizeOrigin(o)) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

/** Where a member travels from: their answer, or the group's default city. */
export const memberOrigin = (m: Pick<Member, 'prefs'>, trip: { origin: string; members: Pick<Member, 'prefs' | 'isOrganizer'>[] }) => {
  const own = memberPrefs(m)?.origin
  return own ? normalizeOrigin(own) : groupDefaultOrigin(trip)
}

export function overlapOf(trip: LoadedTrip) {
  const prefs = trip.members.map(memberPrefs).filter((p): p is Preferences => !!p)
  return computeOverlap(prefs, { ...trip, origin: groupDefaultOrigin(trip) })
}

/** Starting city → members who have answered and travel from there. */
export function travellersByOrigin(trip: Pick<LoadedTrip, 'members' | 'origin'>) {
  const map = new Map<string, Member[]>()
  for (const m of trip.members) {
    if (!m.prefs) continue
    const o = memberOrigin(m, trip)
    map.set(o, [...(map.get(o) ?? []), m])
  }
  return map
}

/**
 * Who may choose or book a city's travel: the organizer, or the only person travelling from that city.
 * (If several people share a starting city, the organizer decides for them.)
 */
export function canEditTravel(member: Member, origin: string, trip: Pick<LoadedTrip, 'members' | 'origin'>) {
  if (member.isOrganizer) return true
  const from = travellersByOrigin(trip).get(origin) ?? []
  return from.length === 1 && from[0].id === member.id
}

/** Old plan documents (single origin, per-person stay prices) → current shape. */
export function upgradeDoc(doc: PlanDocument & { transports?: TransportOption[] }, groupSize: number): PlanDocument {
  let d: PlanDocument = doc
  if (!d.travel) d = { ...d, travel: [{ origin: normalizeOrigin(d.origin), options: doc.transports ?? [] }] }
  if (d.stays.some((s) => s.roomRate == null)) {
    d = {
      ...d,
      pricesCheckedAt: d.pricesCheckedAt ?? null,
      stays: d.stays.map((s) =>
        s.roomRate != null
          ? s
          : { ...s, roomRate: s.pricePerNight * 2, rooms: Math.ceil(groupSize / 2), guestsPerRoom: 2, wholeProperty: false, priceSource: 'estimate', priceNote: null, sources: [] },
      ),
    }
  }
  return d
}

const toBooking = (b: BookingRow): Booking => ({
  kind: b.kind as Booking['kind'],
  origin: b.origin || null,
  optionId: b.optionId,
  stay: b.kind === 'stay' ? fromJson<Stay>(b.snapshot) : null,
  transport: b.kind === 'travel' ? fromJson<TransportOption>(b.snapshot) : null,
  reference: b.reference,
  link: b.link,
  bookedBy: { memberId: b.bookedById, at: b.updatedAt.toISOString() },
})

export function toPlanView(
  row: Plan & { votes: VoteRow[]; swaps: Swap[] },
  trip: { groupSize: number; bookings: BookingRow[]; jobs?: GenerationJob[] },
): PlanView {
  const doc = upgradeDoc(fromJson<PlanDocument>(row.document)!, trip.groupSize)
  const votes: PlanView['votes'] = {}
  for (const v of row.votes) (votes[v.itemId] ??= {})[v.memberId] = v.value as Vote

  let transportIds = fromJson<Record<string, string>>(row.transportIds) ?? {}
  if (!Object.keys(transportIds).length && row.transportId) transportIds = { [doc.travel[0]?.origin ?? doc.origin]: row.transportId }

  const changes = fromJson<{ stay?: ChangeInfo; travel?: Record<string, ChangeInfo> }>(row.changes) ?? {}
  const stayBooking = trip.bookings.find((b) => b.kind === 'stay')
  return {
    id: row.id,
    version: row.version,
    doc,
    stayId: row.stayId,
    transportIds,
    votes,
    swaps: Object.fromEntries(row.swaps.map((s) => [s.slotId, s.altId])),
    swapsBy: Object.fromEntries(row.swaps.map((s) => [s.slotId, { memberId: s.memberId, at: s.at.toISOString() }])),
    changes: { stay: changes.stay ?? null, travel: changes.travel ?? {} },
    bookings: {
      stay: stayBooking ? toBooking(stayBooking) : null,
      travel: Object.fromEntries(trip.bookings.filter((b) => b.kind === 'travel').map((b) => [b.origin, toBooking(b)])),
    },
    stale: fromJson<{ reason: string; at: string }>(row.stale),
    adjustJobId: trip.jobs?.[0]?.id ?? null,
  }
}

export function toTripView(trip: LoadedTrip, viewer: Member): TripView {
  const prefsList = trip.members.map(memberPrefs).filter((p): p is Preferences => !!p)
  const overlap = overlapOf(trip)

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
      origin: p ? memberOrigin(m, trip) : null,
      completedInSec: p?.completedInSec ?? null,
    }
  })

  const row = trip.plans[0]
  const plan = row ? toPlanView(row, trip) : null

  // Each person's cost depends on where they travel from; compare it with their own (private) budget.
  let budgetFit: TripView['budgetFit'] = null
  if (plan) {
    const answered = trip.members.filter((m) => m.prefs)
    const fits = answered.filter((m) => memberPrefs(m)!.budget >= personalCost(plan, memberOrigin(m, trip)).total).length
    budgetFit = { fits, of: answered.length }
  }

  const origins = new Set([...members.flatMap((m) => (m.origin ? [m.origin] : [])), ...(plan?.doc.travel.map((g) => g.origin) ?? [])])

  return {
    id: trip.id,
    name: trip.name,
    destinationQuery: trip.destinationQuery,
    origin: groupDefaultOrigin(trip),
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
    me: {
      memberId: viewer.id,
      isOrganizer: viewer.isOrganizer,
      prefs: memberPrefs(viewer),
      origin: memberOrigin(viewer, trip),
      canEditStay: viewer.isOrganizer,
      editableOrigins: [...origins].filter((o) => canEditTravel(viewer, o, trip)),
    },
    demo: env.demoMode,
  }
}

export async function tripView(tripId: string, viewer: Member) {
  return toTripView(await loadTrip(tripId), viewer)
}
