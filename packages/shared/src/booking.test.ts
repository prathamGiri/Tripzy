import { describe, expect, it } from 'vitest'
import { cleanPropertyUrl, mapsLink, stayLinks, transportLinks } from './booking'

describe('stayLinks', () => {
  const links = stayLinks({ hotelName: 'Zostel Udaipur', area: 'Lal Ghat', city: 'Udaipur', checkin: '2026-12-16', checkout: '2026-12-19', adults: 5 })

  it('pre-fills Booking.com with name, dates, adults and rooms', () => {
    const u = new URL(links.find((l) => l.provider === 'booking')!.url)
    expect(u.searchParams.get('ss')).toBe('Zostel Udaipur, Udaipur')
    expect(u.searchParams.get('checkin')).toBe('2026-12-16')
    expect(u.searchParams.get('checkout')).toBe('2026-12-19')
    expect(u.searchParams.get('group_adults')).toBe('5')
    expect(u.searchParams.get('no_rooms')).toBe('3')
  })

  it('links MakeMyTrip to the hotel page built from its listed name', () => {
    expect(links.find((l) => l.provider === 'makemytrip')!.url).toBe('https://www.makemytrip.com/hotels/zostel_udaipur-details-udaipur.html')
  })

  it('prefers exact property pages found on the web, with dates on Booking.com', () => {
    const [booking, mmt] = stayLinks({
      hotelName: 'Madri Haveli', area: '', city: 'Udaipur', checkin: '2026-12-16', checkout: '2026-12-19', adults: 5, rooms: 3,
      bookingUrl: 'https://www.booking.com/hotel/in/madri-haveli.html?label=xyz',
      makemytripUrl: 'https://www.makemytrip.com/hotels/madri_haveli-details-udaipur.html?city=CTUDR',
    })
    expect(booking.url).toBe('https://www.booking.com/hotel/in/madri-haveli.html?checkin=2026-12-16&checkout=2026-12-19&group_adults=5&no_rooms=3&group_children=0')
    expect(mmt.url).toBe('https://www.makemytrip.com/hotels/madri_haveli-details-udaipur.html')
  })

  it('ignores made-up or off-site URLs', () => {
    expect(cleanPropertyUrl('https://evil.example/hotels/x-details-y.html', 'makemytrip')).toBeNull()
    expect(cleanPropertyUrl('https://www.makemytrip.com/hotels/hotel-listing/?city=CTGOI', 'makemytrip')).toBeNull()
    expect(cleanPropertyUrl('not a url', 'booking')).toBeNull()
  })

  it('adds affiliate ids when configured', () => {
    const [booking] = stayLinks({ hotelName: 'X', area: '', city: 'Goa', checkin: '2026-12-16', checkout: '2026-12-19', adults: 2 }, { booking: '123' })
    expect(new URL(booking.url).searchParams.get('aid')).toBe('123')
  })
})

describe('transportLinks', () => {
  const base = { origin: 'Mumbai', destination: 'Goa', departDate: '2026-12-16', returnDate: '2026-12-19' }
  it('links trains to IRCTC', () => expect(transportLinks({ ...base, mode: 'train' })[0].provider).toBe('irctc'))
  it('builds a redBus route slug with the date', () => {
    expect(transportLinks({ ...base, mode: 'bus' })[0].url).toBe('https://www.redbus.in/bus-tickets/mumbai-to-goa?onward=16-Dec-2026')
  })
  it('puts the route into Google Flights', () => expect(transportLinks({ ...base, mode: 'flight' })[0].url).toContain('Mumbai%20to%20Goa'))
})

it('mapsLink searches place + city', () => {
  expect(mapsLink('Chapora Fort', 'Goa')).toBe('https://www.google.com/maps/search/?api=1&query=Chapora%20Fort%2C%20Goa')
})
