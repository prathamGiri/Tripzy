/**
 * Booking deep links.
 * - Stays: the exact property page on MakeMyTrip / Booking.com when known (found by the web price check,
 *   or MakeMyTrip's name-based page URL), otherwise a search pre-filled with hotel, dates and guests.
 * - Transport: route searches on Google Flights, IRCTC, redBus.
 *
 * To add an affiliate ID or a new provider, change only this file.
 */
import type { BookingLink, TransportMode } from './types'
import { parseDate } from './format'

export interface AffiliateIds {
  booking?: string // Booking.com Affiliate Partner "aid"
  makemytrip?: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n: number) => String(n).padStart(2, '0')
const ddMonYyyy = (iso: string) => {
  const d = parseDate(iso)
  return `${pad(d.getDate())}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`
}
const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const q = encodeURIComponent

export interface StayLinkInput {
  hotelName: string
  area: string
  city: string
  checkin: string // YYYY-MM-DD
  checkout: string
  adults: number
  rooms?: number
  /** Exact property pages found by the web price check, if any. */
  makemytripUrl?: string | null
  bookingUrl?: string | null
}

/** MakeMyTrip hotel pages: makemytrip.com/hotels/<hotel_name>-details-<city>.html */
const MMT_DETAILS = /^https:\/\/www\.makemytrip\.com\/hotels\/[a-z0-9_]+-details-[a-z0-9_]+\.html$/i
/** Booking.com property pages: booking.com/hotel/in/<slug>.html (optionally .en-gb.html etc.) */
const BOOKING_HOTEL = /^https:\/\/www\.booking\.com\/hotel\/[a-z]{2}\/[a-z0-9-]+(\.[a-z-]+)?\.html$/i

const under = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

/** Clean a URL found on the web: keep it only if it is a real property page on that site. */
export function cleanPropertyUrl(url: string | null | undefined, site: 'makemytrip' | 'booking'): string | null {
  if (!url) return null
  try {
    const u = new URL(url.trim())
    u.protocol = 'https:'
    if (site === 'makemytrip' && u.hostname === 'makemytrip.com') u.hostname = 'www.makemytrip.com'
    if (site === 'booking' && u.hostname === 'booking.com') u.hostname = 'www.booking.com'
    const bare = `${u.origin}${u.pathname}`
    return (site === 'makemytrip' ? MMT_DETAILS : BOOKING_HOTEL).test(bare) ? bare : null
  } catch {
    return null
  }
}

/** The MakeMyTrip page for a hotel, from its exact listed name (verified pattern; unknown names fall back to MMT's hotel home). */
export const makemytripHotelUrl = (hotelName: string, city: string) =>
  `https://www.makemytrip.com/hotels/${under(hotelName)}-details-${under(city)}.html`

export function stayLinks(i: StayLinkInput, aff: AffiliateIds = {}): BookingLink[] {
  const rooms = i.rooms ?? Math.max(1, Math.ceil(i.adults / 2))
  const text = `${i.hotelName}, ${i.city}`

  // Booking.com: the exact property page when known, otherwise a pre-filled search
  const verifiedBooking = cleanPropertyUrl(i.bookingUrl, 'booking')
  const booking = new URL(verifiedBooking ?? 'https://www.booking.com/searchresults.html')
  if (!verifiedBooking) booking.searchParams.set('ss', text)
  booking.searchParams.set('checkin', i.checkin)
  booking.searchParams.set('checkout', i.checkout)
  booking.searchParams.set('group_adults', String(i.adults))
  booking.searchParams.set('no_rooms', String(rooms))
  booking.searchParams.set('group_children', '0')
  if (aff.booking) booking.searchParams.set('aid', aff.booking)

  // MakeMyTrip: the property page (found on the web, or built from the exact listed name)
  const mmt = new URL(cleanPropertyUrl(i.makemytripUrl, 'makemytrip') ?? makemytripHotelUrl(i.hotelName, i.city))
  if (aff.makemytrip) mmt.searchParams.set('cmp', aff.makemytrip)

  return [
    { provider: 'booking', label: 'Booking.com', url: booking.toString() },
    { provider: 'makemytrip', label: 'MakeMyTrip', url: mmt.toString() },
    { provider: 'google', label: 'Google Hotels', url: `https://www.google.com/travel/search?q=${q(text)}` },
  ]
}

export interface TransportLinkInput {
  mode: TransportMode
  origin: string
  destination: string
  departDate: string
  returnDate: string
}

export function transportLinks(i: TransportLinkInput): BookingLink[] {
  switch (i.mode) {
    case 'flight':
      return [
        {
          provider: 'google',
          label: 'Google Flights',
          url: `https://www.google.com/travel/flights?q=${q(`Flights from ${i.origin} to ${i.destination} on ${i.departDate} returning ${i.returnDate}`)}`,
        },
        { provider: 'makemytrip', label: 'MakeMyTrip', url: 'https://www.makemytrip.com/flights/' },
      ]
    case 'train':
      return [
        { provider: 'irctc', label: 'IRCTC', url: 'https://www.irctc.co.in/nget/train-search' },
        { provider: 'makemytrip', label: 'MakeMyTrip Rail', url: 'https://www.makemytrip.com/railways/' },
      ]
    case 'bus':
      return [
        {
          provider: 'redbus',
          label: 'redBus',
          url: `https://www.redbus.in/bus-tickets/${slug(i.origin)}-to-${slug(i.destination)}?onward=${q(ddMonYyyy(i.departDate))}`,
        },
      ]
    case 'car':
      return [
        {
          provider: 'google',
          label: 'Route on Google Maps',
          url: `https://www.google.com/maps/dir/?api=1&origin=${q(i.origin)}&destination=${q(i.destination)}`,
        },
      ]
  }
}

export const mapsLink = (place: string, city: string) =>
  `https://www.google.com/maps/search/?api=1&query=${q(`${place}, ${city}`)}`
