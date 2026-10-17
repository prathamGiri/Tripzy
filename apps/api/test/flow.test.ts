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
