/**
 * Typed client for the Tripzy API. Works anywhere `fetch` exists (browser, React Native, Node 18+).
 * Each call takes the member token explicitly so the caller decides how tokens are stored.
 */
import type { CreateTripInput } from './schemas'
import type { InvitePreview, JobView, MemberToken, Preferences, TripView, Vote } from './types'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }
}

export class TripzyApi {
  constructor(private baseUrl: string) {}

  private async req<T>(method: string, path: string, opts: { body?: unknown; token?: string | null } = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
    const data = res.status === 204 ? null : await res.json().catch(() => null)
    if (!res.ok) throw new ApiError(res.status, data?.error ?? res.statusText, data?.details)
    return data as T
  }

  health = () => this.req<{ ok: boolean; ai: string; demo: boolean }>('GET', '/health')

  createTrip = (input: CreateTripInput) => this.req<{ trip: TripView; token: string }>('POST', '/trips', { body: input })
  getTrip = (tripId: string, token: string) => this.req<TripView>('GET', `/trips/${tripId}`, { token })
  lock = (tripId: string, token: string) => this.req<TripView>('POST', `/trips/${tripId}/lock`, { token })

  invite = (code: string) => this.req<InvitePreview>('GET', `/invites/${code}`)
  join = (code: string, name: string) => this.req<MemberToken>('POST', `/invites/${code}/join`, { body: { name } })

  savePrefs = (tripId: string, prefs: Preferences, token: string) =>
    this.req<TripView>('PUT', `/trips/${tripId}/members/me/prefs`, { body: prefs, token })

  startPlan = (tripId: string, token: string) => this.req<JobView>('POST', `/trips/${tripId}/plans`, { token })
  job = (tripId: string, jobId: string, token: string) => this.req<JobView>('GET', `/trips/${tripId}/plans/jobs/${jobId}`, { token })

  vote = (tripId: string, itemId: string, value: Vote | null, token: string) =>
    this.req<TripView>('POST', `/trips/${tripId}/plan/votes`, { body: { itemId, value }, token })
  swap = (tripId: string, slotId: string, altId: string | null, token: string) =>
    this.req<TripView>('POST', `/trips/${tripId}/plan/swaps`, { body: { slotId, altId }, token })
  select = (tripId: string, sel: { stayId?: string; transportId?: string }, token: string) =>
    this.req<TripView>('PATCH', `/trips/${tripId}/plan`, { body: sel, token })

  /* Demo-mode only (the API returns 404 unless DEMO_MODE=true) */
  demoTokens = (tripId: string, token: string) => this.req<MemberToken[]>('GET', `/demo/trips/${tripId}/tokens`, { token })
  demoSample = () => this.req<{ tripId: string; tokens: MemberToken[] }>('POST', '/demo/sample-trip')
}
