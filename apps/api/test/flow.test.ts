/** End-to-end API flow: create → join → preferences → generate → vote/swap/select → lock. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { JobView, MemberToken, TripView } from '@tripzy/shared'
import { buildApp } from '../src/app'

let app: FastifyInstance
beforeAll(async () => {
  app = await buildApp({ logger: false })
})
afterAll(() => app.close())

const call = async <T>(method: string, url: string, body?: unknown, token?: string) => {
  const res = await app.inject({
    method: method as 'GET',
    url,
    payload: body as object,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  })
  return { status: res.statusCode, body: res.json() as T }
}

const prefs = (budget: number, dates: string[]) => ({
  budget,
  style: 'relaxed',
  interests: ['beaches', 'food'],
  food: [],
  dates,
})

describe('trip flow', () => {
  it('runs the whole group flow', async () => {
    const created = await call<{ trip: TripView; token: string }>('POST', '/trips', {
      name: 'Test trip',
      organizerName: 'Arjun',
      destinationQuery: 'Goa',
      origin: 'Mumbai',
      windowStart: '2026-12-12',
      windowEnd: '2026-12-22',
      days: 4,
      groupSize: 4,
    })
    expect(created.status).toBe(201)
    const { trip, token: orgToken } = created.body
    expect(trip.members).toHaveLength(1)

    // Unauthorised access is refused
    expect((await call('GET', `/trips/${trip.id}`)).status).toBe(401)

    // A friend joins through the invite code
    const preview = await call<{ tripName: string }>('GET', `/invites/${trip.inviteCode}`)
    expect(preview.body.tripName).toBe('Test trip')
    const joined = await call<MemberToken>('POST', `/invites/${trip.inviteCode}/join`, { name: 'Kabir' })
    expect(joined.status).toBe(201)

    // Can't generate with fewer than 2 responses
    expect((await call('POST', `/trips/${trip.id}/plans`, undefined, orgToken)).status).toBe(400)

    const dates = ['2026-12-16', '2026-12-17', '2026-12-18', '2026-12-19', '2026-12-20']
    await call('PUT', `/trips/${trip.id}/members/me/prefs`, prefs(20000, dates), orgToken)
    const after = await call<TripView>('PUT', `/trips/${trip.id}/members/me/prefs`, prefs(25000, dates), joined.body.token)
    expect(after.body.overlap.respondedCount).toBe(2)
    expect(after.body.overlap.budget.min).toBe(20000)
    // Individual budgets are never exposed
    expect(JSON.stringify(after.body.members)).not.toContain('25000')

    // Only the organizer can generate
    expect((await call('POST', `/trips/${trip.id}/plans`, undefined, joined.body.token)).status).toBe(403)
    const job = await call<JobView>('POST', `/trips/${trip.id}/plans`, undefined, orgToken)
    expect(job.status).toBe(202)

    let status = job.body.status
    for (let i = 0; i < 40 && status !== 'done' && status !== 'failed'; i++) {
      await new Promise((r) => setTimeout(r, 250))
      status = (await call<JobView>('GET', `/trips/${trip.id}/plans/jobs/${job.body.id}`, undefined, orgToken)).body.status
    }
    expect(status).toBe('done')

    const view = (await call<TripView>('GET', `/trips/${trip.id}`, undefined, orgToken)).body
    const plan = view.plan!
    expect(plan.doc.days).toHaveLength(4)
    expect(plan.doc.dates[0]).toBe('2026-12-16')
    expect(plan.doc.stays[0].links.map((l) => l.provider)).toEqual(['booking', 'makemytrip', 'google'])
    expect(plan.doc.stays[0].links[0].url).toContain('checkin=2026-12-16')
    expect(view.budgetFit).toEqual({ fits: 2, of: 2 })

    // Vote, swap, change stay
    const slot = plan.doc.days.flatMap((d) => d.items).find((a) => a.alts.length)!
    const voted = await call<TripView>('POST', `/trips/${trip.id}/plan/votes`, { itemId: slot.id, value: 'down' }, joined.body.token)
    expect(voted.body.plan!.votes[slot.id][joined.body.memberId]).toBe('down')
    const swapped = await call<TripView>('POST', `/trips/${trip.id}/plan/swaps`, { slotId: slot.id, altId: slot.alts[0].id }, joined.body.token)
    expect(swapped.body.plan!.swaps[slot.id]).toBe(slot.alts[0].id)
    const other = plan.doc.stays.find((s) => s.id !== plan.stayId)!
    const selected = await call<TripView>('PATCH', `/trips/${trip.id}/plan`, { stayId: other.id }, orgToken)
    expect(selected.body.plan!.stayId).toBe(other.id)

    // Lock: organizer only, then everything is read-only
    expect((await call('POST', `/trips/${trip.id}/lock`, undefined, joined.body.token)).status).toBe(403)
    expect((await call<TripView>('POST', `/trips/${trip.id}/lock`, undefined, orgToken)).body.locked).toBe(true)
    expect((await call('POST', `/trips/${trip.id}/plan/votes`, { itemId: slot.id, value: 'up' }, orgToken)).status).toBe(409)
  })

  it('handles different starting cities, permissions, bookings and itinerary updates', async () => {
    const created = await call<{ trip: TripView; token: string }>('POST', '/trips', {
      name: 'Cities trip', organizerName: 'Arjun', destinationQuery: 'Goa', origin: 'Mumbai',
      windowStart: '2026-12-12', windowEnd: '2026-12-22', days: 4, groupSize: 4,
    })
    const { trip, token: org } = created.body
    const join = async (name: string) => (await call<MemberToken>('POST', `/invites/${trip.inviteCode}/join`, { name })).body
    const [kabir, neha, rohan] = [await join('Kabir'), await join('Neha'), await join('Rohan')]
    const dates = ['2026-12-16', '2026-12-17', '2026-12-18', '2026-12-19']
    await call('PUT', `/trips/${trip.id}/members/me/prefs`, prefs(25000, dates), org) // no origin → trip default (Mumbai)
    await call('PUT', `/trips/${trip.id}/members/me/prefs`, { ...prefs(25000, dates), origin: 'mumbai' }, kabir.token)
    await call('PUT', `/trips/${trip.id}/members/me/prefs`, { ...prefs(30000, dates), origin: 'Delhi' }, neha.token)
    const v0 = (await call<TripView>('PUT', `/trips/${trip.id}/members/me/prefs`, { ...prefs(25000, dates), origin: 'Already there' }, rohan.token)).body
    expect(v0.overlap.origins).toEqual(expect.arrayContaining([{ key: 'Mumbai', count: 2 }, { key: 'Delhi', count: 1 }, { key: 'Already there', count: 1 }]))
    expect(v0.me.origin).toBe('Already there')

    const job = (await call<JobView>('POST', `/trips/${trip.id}/plans`, undefined, org)).body
    const waitJob = async (id: string) => {
      for (let i = 0; i < 40; i++) {
        const j = (await call<JobView>('GET', `/trips/${trip.id}/plans/jobs/${id}`, undefined, org)).body
        if (j.status === 'done' || j.status === 'failed') return j
        await new Promise((r) => setTimeout(r, 250))
      }
    }
    expect((await waitJob(job.id))?.status).toBe('done')

    const asNeha = (await call<TripView>('GET', `/trips/${trip.id}`, undefined, neha.token)).body
    const plan = asNeha.plan!
    expect(plan.doc.travel.map((g) => g.origin).sort()).toEqual(['Delhi', 'Mumbai'])
    expect(Object.keys(plan.transportIds).sort()).toEqual(['Delhi', 'Mumbai'])
    // Neha is the only one from Delhi → she decides her travel; Mumbai is shared → organizer decides.
    expect(asNeha.me.editableOrigins).toEqual(['Delhi'])
    expect(asNeha.me.canEditStay).toBe(false)
    const asKabir = (await call<TripView>('GET', `/trips/${trip.id}`, undefined, kabir.token)).body
    expect(asKabir.me.editableOrigins).toEqual([])

    const delhiOpts = plan.doc.travel.find((g) => g.origin === 'Delhi')!.options
    const mumbaiOpts = plan.doc.travel.find((g) => g.origin === 'Mumbai')!.options
    const other = plan.doc.stays.find((s) => s.id !== plan.stayId)!
    expect((await call('PATCH', `/trips/${trip.id}/plan`, { stayId: other.id }, neha.token)).status).toBe(403)
    expect((await call('PATCH', `/trips/${trip.id}/plan`, { transportId: mumbaiOpts[0].id, origin: 'Mumbai' }, kabir.token)).status).toBe(403)
    const nehaPick = delhiOpts.find((o) => o.id !== plan.transportIds.Delhi) ?? delhiOpts[0]
    const changed = await call<TripView>('PATCH', `/trips/${trip.id}/plan`, { transportId: nehaPick.id }, neha.token)
    expect(changed.status).toBe(200)
    expect(changed.body.plan!.transportIds.Delhi).toBe(nehaPick.id)
    expect(changed.body.plan!.changes.travel.Delhi.memberId).toBe(neha.memberId)
    expect(changed.body.plan!.stale?.reason).toContain('Delhi')

    // Swaps record who made them
    const slot = plan.doc.days.flatMap((d) => d.items).find((a) => a.alts.length)!
    const swapped = (await call<TripView>('POST', `/trips/${trip.id}/plan/swaps`, { slotId: slot.id, altId: slot.alts[0].id }, kabir.token)).body
    expect(swapped.plan!.swapsBy[slot.id].memberId).toBe(kabir.memberId)

    // Organizer books a different stay → it replaces the chosen one and the itinerary update starts by itself
    const booked = await call<TripView>('PUT', `/trips/${trip.id}/bookings/stay`, { optionId: null, name: 'Casa Test Villa', area: 'Assagao', totalPrice: 60000, reference: 'ABC123' }, org)
    expect(booked.status).toBe(200)
    expect(booked.body.plan!.bookings.stay!.stay!.priceSource).toBe('booked')
    expect(booked.body.plan!.bookings.stay!.stay!.pricePerNight).toBe(5000) // 60000 / 3 nights / 4 people
    expect((await call('PUT', `/trips/${trip.id}/bookings/stay`, { optionId: plan.stayId }, neha.token)).status).toBe(403)

    // Neha books her own train arriving late; the adjust job re-times Day 1 and keeps votes/swaps
    for (let i = 0; i < 40; i++) {
      const v = (await call<TripView>('GET', `/trips/${trip.id}`, undefined, org)).body
      if (!v.plan!.adjustJobId) break
      await new Promise((r) => setTimeout(r, 250))
    }
    const tb = await call<TripView>('PUT', `/trips/${trip.id}/bookings/travel/Delhi`, { optionId: null, mode: 'train', label: 'Rajdhani Express', pricePerPersonReturn: 6000, arriveTime: '16:00' }, neha.token)
    expect(tb.status).toBe(200)
    let after: TripView | undefined
    for (let i = 0; i < 40; i++) {
      after = (await call<TripView>('GET', `/trips/${trip.id}`, undefined, neha.token)).body
      if (!after.plan!.adjustJobId && !after.plan!.stale) break
      await new Promise((r) => setTimeout(r, 250))
    }
    expect(after!.plan!.stale).toBeNull()
    expect(after!.plan!.doc.days[0].items[0].time >= '17:00').toBe(true) // an hour after the 16:00 arrival
    expect(after!.plan!.swaps[slot.id]).toBe(slot.alts[0].id)
    expect(after!.plan!.bookings.travel.Delhi.transport!.label).toBe('Rajdhani Express')

    // Bookings stay editable after locking
    await call('POST', `/trips/${trip.id}/lock`, undefined, org)
    expect((await call('DELETE', `/trips/${trip.id}/bookings/travel/Delhi`, undefined, neha.token)).status).toBe(200)
  })

  it("works without a trip-level starting city: the organizer's answer becomes the default", async () => {
    const created = await call<{ trip: TripView; token: string }>('POST', '/trips', {
      name: 'No origin', organizerName: 'Arjun', destinationQuery: 'Goa',
      windowStart: '2026-12-12', windowEnd: '2026-12-22', days: 4, groupSize: 3,
    })
    expect(created.status).toBe(201)
    const { trip, token: org } = created.body
    expect(trip.origin).toBe('')
    const friend = (await call<MemberToken>('POST', `/invites/${trip.inviteCode}/join`, { name: 'Kabir' })).body
    const dates = ['2026-12-16', '2026-12-17', '2026-12-18', '2026-12-19']
    const v = (await call<TripView>('PUT', `/trips/${trip.id}/members/me/prefs`, { ...prefs(25000, dates), origin: 'Pune' }, org)).body
    expect(v.origin).toBe('Pune')
    // A friend who hasn't said where they start from defaults to the organizer's city
    expect((await call<TripView>('GET', `/trips/${trip.id}`, undefined, friend.token)).body.me.origin).toBe('Pune')
  })

  it('demo mode seeds friends and builds a sample trip', async () => {
    const sample = await call<{ tripId: string; tokens: MemberToken[] }>('POST', '/demo/sample-trip')
    expect(sample.status).toBe(201)
    expect(sample.body.tokens).toHaveLength(6)
    const view = await call<TripView>('GET', `/trips/${sample.body.tripId}`, undefined, sample.body.tokens[0].token)
    expect(view.body.overlap.respondedCount).toBe(6)
  })

  it('rejects bad input with field errors', async () => {
    const res = await call<{ error: string }>('POST', '/trips', { name: '' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid request')
  })
})
