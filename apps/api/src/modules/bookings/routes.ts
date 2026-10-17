/**
 * "We booked it": record the stay (organizer) or a city's travel (organizer, or the only person travelling from it),
 * either the suggested option or something else. Bookings stay editable after the trip is locked.
 * Saving a booking updates the itinerary around it automatically.
 */
import type { FastifyInstance } from 'fastify'
import {
  inr,
  normalizeOrigin,
  stayLinks,
  StayBookingSchema,
  transportLinks,
  travelOptions,
  TravelBookingSchema,
  type BookingLink,
  type Stay,
  type TransportOption,
} from '@tripzy/shared'
import { env } from '../../config/env'
import { requireMember, requireOrganizer } from '../../lib/auth'
import { db, toJson } from '../../lib/db'
import { HttpError, notFound, parse } from '../../lib/http'
import { markStale, startAdjust } from '../plans/service'
import { canEditTravel, loadTrip, toPlanView, tripView } from '../trips/view'

const nightsBetween = (a: string, b: string) => Math.max(1, Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000))
const yourBooking = (link: string | null | undefined): BookingLink[] => (link ? [{ provider: 'yours', label: 'Your booking', url: link }] : [])

async function currentPlan(tripId: string) {
  const trip = await loadTrip(tripId)
  const row = trip.plans[0]
  if (!row) throw new HttpError(409, 'Generate a plan first')
  return { trip, row, view: toPlanView(row, trip) }
}

export async function bookingRoutes(app: FastifyInstance) {
  app.put<{ Params: { id: string } }>('/trips/:id/bookings/stay', async (req) => {
    const me = await requireOrganizer(req, req.params.id)
    const input = parse(StayBookingSchema, req.body)
    const { trip, row, view } = await currentPlan(req.params.id)
    const doc = view.doc
    let stay: Stay

    if (input.optionId) {
      const s = doc.stays.find((x) => x.id === input.optionId)
      if (!s) throw new HttpError(400, 'Unknown stay')
      stay = { ...s, priceSource: 'booked', priceNote: input.reference ? `Booked · ref ${input.reference}` : 'Booked', links: [...yourBooking(input.link), ...s.links] }
    } else {
      const checkin = input.checkin ?? doc.dates[0]
      const checkout = input.checkout ?? doc.dates[doc.dates.length - 1]
      const nights = nightsBetween(checkin, checkout)
      const total = input.totalPrice!
      stay = {
        id: 'booked-stay',
        name: input.name!,
        area: input.area ?? '',
        emoji: '🏨',
        kind: 'Your booking',
        tier: 'mid',
        roomRate: Math.round(total / nights),
        rooms: 1,
        guestsPerRoom: trip.groupSize,
        wholeProperty: true,
        pricePerNight: Math.round(total / nights / trip.groupSize),
        priceSource: 'booked',
        priceNote: `Booked: ${inr(total)} for ${nights} night${nights > 1 ? 's' : ''} (${checkin} → ${checkout})${input.reference ? ` · ref ${input.reference}` : ''}`,
        sources: [],
        rating: null,
        perks: [],
        why: '',
        links: input.link
          ? yourBooking(input.link)
          : stayLinks({ hotelName: input.name!, area: input.area ?? '', city: doc.destination.name, checkin, checkout, adults: trip.groupSize }, env.affiliates),
      }
    }

    const data = { optionId: input.optionId, snapshot: toJson(stay), reference: input.reference ?? null, link: input.link ?? null, bookedById: me.id }
    await db.booking.upsert({
      where: { tripId_kind_origin: { tripId: trip.id, kind: 'stay', origin: '' } },
      create: { tripId: trip.id, kind: 'stay', origin: '', ...data },
      update: data,
    })
    await markStale(row.id, `Stay booked: ${stay.name}${stay.area ? ` (${stay.area})` : ''}`)
    await startAdjust(trip.id)
    return tripView(trip.id, me)
  })

  app.delete<{ Params: { id: string } }>('/trips/:id/bookings/stay', async (req) => {
    const me = await requireOrganizer(req, req.params.id)
    const { trip, row } = await currentPlan(req.params.id)
    const { count } = await db.booking.deleteMany({ where: { tripId: trip.id, kind: 'stay' } })
    if (!count) throw notFound('No stay booking')
    await markStale(row.id, 'Stay booking removed')
    return tripView(trip.id, me)
  })

  app.put<{ Params: { id: string; origin: string } }>('/trips/:id/bookings/travel/:origin', async (req) => {
    const me = await requireMember(req, req.params.id)
    const input = parse(TravelBookingSchema, req.body)
    const { trip, row, view } = await currentPlan(req.params.id)
    const origin = normalizeOrigin(decodeURIComponent(req.params.origin))
    if (!canEditTravel(me, origin, trip)) throw new HttpError(403, `Only the organizer can book travel from ${origin}`)
    const doc = view.doc
    const ref = input.reference ? `Booked · ref ${input.reference}` : 'Booked'
    let t: TransportOption

    if (input.optionId) {
      const o = travelOptions(doc, origin).find((x) => x.id === input.optionId)
      if (!o) throw new HttpError(400, 'Unknown travel option')
      t = { ...o, arrive: input.arriveTime ?? o.arrive ?? null, returnDepart: input.returnDepartTime ?? o.returnDepart ?? null, note: ref, links: [...yourBooking(input.link), ...o.links] }
    } else {
      t = {
        id: `booked-${origin.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        mode: input.mode!,
        label: input.label!,
        duration: '',
        depart: '',
        arrive: input.arriveTime ?? null,
        returnDepart: input.returnDepartTime ?? null,
        price: Math.round(input.pricePerPersonReturn! / 2),
        note: ref,
        links: input.link
          ? yourBooking(input.link)
          : transportLinks({ mode: input.mode!, origin, destination: doc.destination.name, departDate: doc.dates[0], returnDate: doc.dates[doc.dates.length - 1] }),
      }
    }

    const data = { optionId: input.optionId, snapshot: toJson(t), reference: input.reference ?? null, link: input.link ?? null, bookedById: me.id }
    await db.booking.upsert({
      where: { tripId_kind_origin: { tripId: trip.id, kind: 'travel', origin } },
      create: { tripId: trip.id, kind: 'travel', origin, ...data },
      update: data,
    })
    await markStale(row.id, `Travel from ${origin} booked: ${t.label}${t.arrive ? `, arriving ${t.arrive}` : ''}${t.returnDepart ? `, leaving ${t.returnDepart} on the last day` : ''}`)
    await startAdjust(trip.id)
    return tripView(trip.id, me)
  })

  app.delete<{ Params: { id: string; origin: string } }>('/trips/:id/bookings/travel/:origin', async (req) => {
    const me = await requireMember(req, req.params.id)
    const { trip, row } = await currentPlan(req.params.id)
    const origin = normalizeOrigin(decodeURIComponent(req.params.origin))
    if (!canEditTravel(me, origin, trip)) throw new HttpError(403, `Only the organizer can change travel from ${origin}`)
    const { count } = await db.booking.deleteMany({ where: { tripId: trip.id, kind: 'travel', origin } })
    if (!count) throw notFound('No booking for that city')
    await markStale(row.id, `Travel booking from ${origin} removed`)
    return tripView(trip.id, me)
  })
}
