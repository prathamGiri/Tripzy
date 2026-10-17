/**
 * Turns a raw planner reply into the PlanDocument we store and serve:
 * stable ids, real dates, booking links, a gradient, and sanity limits.
 */
import {
  cleanPropertyUrl,
  normalizeOrigin,
  gradientFor,
  stayLinks,
  transportLinks,
  type AffiliateIds,
  type PlanDocument,
  type Tag,
  TAG_IDS,
} from '@tripzy/shared'
import type { PriceCheck } from './price-check'
import type { RawAdjust, RawPlan } from './schema'

export interface EnrichContext {
  /** The trip's default starting city. */
  origin: string
  /** Every starting city that needs travel options (people already there excluded). */
  origins: string[]
  dates: string[]
  groupSize: number
  generatedWith: number
  source: 'ai' | 'mock'
  model: string | null
  affiliates: AffiliateIds
}

const money = (n: number) => Math.max(0, Math.round(Number.isFinite(n) ? n : 0))
const tags = (t: string[]) => t.filter((x): x is Tag => (TAG_IDS as string[]).includes(x))
const rating = (r: number | null) => (r == null ? null : Math.min(5, Math.max(0, Math.round((r > 5 ? r / 2 : r) * 10) / 10)))

/** Rooms needed and the per-person share of a room (or whole-property) rate. */
export function roomPricing(roomRate: number, guestsPerRoom: number, wholeProperty: boolean, groupSize: number) {
  const perRoom = Math.min(8, Math.max(1, Math.round(guestsPerRoom) || 2))
  const rooms = wholeProperty ? 1 : Math.ceil(groupSize / perRoom)
  const rate = money(roomRate)
  return { roomRate: rate, rooms, guestsPerRoom: perRoom, wholeProperty, pricePerNight: Math.round((rate * rooms) / Math.max(1, groupSize)) }
}

const hhmm = (t: string) => (/^\d{1,2}:\d{2}$/.test(t.trim()) ? t.trim().padStart(5, '0') : t.trim().slice(0, 5))

export function toPlanDocument(raw: RawPlan, ctx: EnrichContext): PlanDocument {
  const dates = ctx.dates
  const days = raw.days.slice(0, dates.length)
  const city = raw.destination.name
  const checkin = dates[0]
  const checkout = dates[dates.length - 1]

  return {
    destination: { ...raw.destination, gradient: gradientFor(city) },
    origin: ctx.origin,
    dates: dates.slice(0, Math.max(days.length, 1)),
    days: days.map((d, di) => ({
      date: dates[di],
      title: d.title,
      items: d.items.slice(0, 7).map((a, ai) => {
        const id = `d${di + 1}-i${ai + 1}`
        return {
          id,
          time: hhmm(a.time),
          emoji: a.emoji,
          title: a.title,
          place: a.place,
          cost: money(a.costPerPerson),
          tags: tags(a.tags),
          why: a.why,
          travel: a.travelFromPrevious
            ? { mode: a.travelFromPrevious.mode, mins: money(a.travelFromPrevious.minutes), cost: money(a.travelFromPrevious.costPerPerson) }
            : null,
          alts: a.alternatives.slice(0, 3).map((x, k) => ({
            id: `${id}-a${k + 1}`,
            emoji: x.emoji,
            title: x.title,
            place: x.place,
            cost: money(x.costPerPerson),
            tags: tags(x.tags),
            why: x.why,
          })),
        }
      }),
    })),
    stays: raw.stays.slice(0, 4).map((s, k) => {
      const room = roomPricing(s.roomRatePerNight, s.guestsPerRoom, s.wholeProperty, ctx.groupSize)
      return {
        id: `stay-${k + 1}`,
        name: s.name,
        area: s.area,
        emoji: s.emoji,
        kind: s.kind,
        tier: s.tier,
        ...room,
        priceSource: ctx.source === 'mock' ? ('sample' as const) : ('estimate' as const),
        priceNote: null,
        sources: [],
        rating: rating(s.rating),
        perks: s.perks.slice(0, 5),
        why: s.why,
        links: stayLinks({ hotelName: s.name, area: s.area, city, checkin, checkout, adults: ctx.groupSize, rooms: room.rooms }, ctx.affiliates),
      }
    }),
    travel: ctx.origins.map((origin, gi) => {
      const group = raw.travel.find((g) => normalizeOrigin(g.origin) === origin) ?? (ctx.origins.length === 1 ? raw.travel[0] : undefined)
      return {
        origin,
        options: (group?.options ?? []).slice(0, 4).map((t, k) => ({
          id: `tr-${gi + 1}-${k + 1}`,
          mode: t.mode,
          label: t.label,
          duration: t.duration,
          depart: hhmm(t.departTime),
          arrive: t.arriveTime ? hhmm(t.arriveTime) : null,
          returnDepart: null,
          price: money(t.pricePerPersonOneWay),
          note: t.note,
          links: transportLinks({ mode: t.mode, origin, destination: city, departDate: checkin, returnDate: checkout }),
        })),
      }
    }),
    foodPerDay: money(raw.foodPerDayPerPerson),
    tips: raw.tips.slice(0, 5),
    source: ctx.source,
    model: ctx.model,
    pricesCheckedAt: null,
    generatedWith: ctx.generatedWith,
  }
}

/** Throws if the plan is unusable (the job then fails with a clear message). */
export function assertUsable(doc: PlanDocument) {
  if (doc.days.length < 2) throw new Error('The plan has fewer than 2 days')
  if (!doc.stays.length) throw new Error('The plan has no stay options')
  const missing = doc.travel.filter((g) => !g.options.length).map((g) => g.origin)
  if (missing.length) throw new Error(`The plan has no travel options from ${missing.join(', ')}`)
  if (doc.days.some((d) => !d.items.length)) throw new Error('A day in the plan has no activities')
}

/**
 * Merge a web price check into the plan: real room rates, exact names, property pages and sources.
 * Stays the check could not find keep the planner's estimate (priceSource stays "estimate").
 */
export function applyPriceCheck(doc: PlanDocument, check: PriceCheck, ctx: Pick<EnrichContext, 'groupSize' | 'affiliates'>): PlanDocument {
  const city = doc.destination.name
  const checkin = doc.dates[0]
  const checkout = doc.dates[doc.dates.length - 1]
  const byName = new Map(check.stays.map((c) => [c.originalName.trim().toLowerCase(), c]))

  const stays = doc.stays.map((s, k) => {
    const c = byName.get(s.name.trim().toLowerCase()) ?? check.stays[k]
    if (!c || (!c.found && !c.replaced) || !(c.roomRatePerNight > 0)) return s
    const room = roomPricing(c.roomRatePerNight, c.guestsPerRoom, c.wholeProperty, ctx.groupSize)
    const name = c.name.trim() || s.name
    const sources = c.sourceUrls
      .filter((u) => /^https?:\/\//.test(u))
      .slice(0, 3)
      .map((url) => ({ label: new URL(url).hostname.replace(/^www\./, ''), url }))
    return {
      ...s,
      name,
      area: c.replaced ? c.area : s.area,
      kind: c.replaced ? c.kind : s.kind,
      emoji: c.replaced ? c.emoji : s.emoji,
      ...room,
      priceSource: c.found ? ('web' as const) : ('estimate' as const),
      priceNote: c.note || null,
      sources,
      rating: rating(c.rating) ?? s.rating,
      perks: c.replaced && c.perks?.length ? c.perks.slice(0, 5) : s.perks,
      why: c.replaced && c.why ? c.why : s.why,
      links: stayLinks(
        {
          hotelName: name, area: s.area, city, checkin, checkout, adults: ctx.groupSize, rooms: room.rooms,
          makemytripUrl: cleanPropertyUrl(c.makemytripUrl, 'makemytrip'),
          bookingUrl: cleanPropertyUrl(c.bookingUrl, 'booking'),
        },
        ctx.affiliates,
      ),
    }
  })
  return { ...doc, stays, pricesCheckedAt: new Date().toISOString() }
}

/**
 * Merge an itinerary update into the plan. Kept items keep their id (so votes and swaps survive),
 * their content and alternatives; only time and travel change. New items get fresh ids. Changed items are flagged.
 */
export function mergeAdjusted(doc: PlanDocument, adj: RawAdjust): PlanDocument {
  const existing = new Map(doc.days.flatMap((d) => d.items).map((a) => [a.id, a]))
  const stamp = Date.now().toString(36)
  const days = doc.days.map((day, di) => {
    const upd = adj.days[di]
    if (!upd || !upd.items.length) return day
    return {
      ...day,
      title: upd.title || day.title,
      items: upd.items.slice(0, 8).map((a, ai) => {
        const old = a.keepId ? existing.get(a.keepId) : undefined
        const travel = a.travelFromPrevious
          ? { mode: a.travelFromPrevious.mode, mins: money(a.travelFromPrevious.minutes), cost: money(a.travelFromPrevious.costPerPerson) }
          : null
        if (old) {
          existing.delete(old.id) // each old item can be kept once
          const time = hhmm(a.time)
          const changed = time !== old.time || JSON.stringify(travel) !== JSON.stringify(old.travel)
          return { ...old, time, travel, updated: changed || old.updated }
        }
        const id = `d${di + 1}-u${stamp}${ai}`
        return {
          id,
          time: hhmm(a.time),
          emoji: a.emoji,
          title: a.title,
          place: a.place,
          cost: money(a.costPerPerson),
          tags: tags(a.tags),
          why: a.why,
          travel,
          alts: a.alternatives.slice(0, 3).map((x, k) => ({
            id: `${id}-a${k + 1}`, emoji: x.emoji, title: x.title, place: x.place, cost: money(x.costPerPerson), tags: tags(x.tags), why: x.why,
          })),
          updated: true,
        }
      }),
    }
  })
  return { ...doc, days }
}
