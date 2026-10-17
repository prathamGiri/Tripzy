/**
 * Which trips this browser belongs to, and as whom. Tokens are the member's identity (no sign-up),
 * so they live only in this browser's localStorage.
 * A browser can hold several members of one trip (demo mode: switching between people).
 */
export interface Membership {
  memberId: string
  token: string
  name: string
}

export interface SessionStore {
  currentTripId: string | null
  trips: Record<string, { active: string; members: Record<string, Membership> }>
}

const KEY = 'tripzy-session-v2'
const empty = (): SessionStore => ({ currentTripId: null, trips: {} })

export function loadSession(): SessionStore {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty()
  } catch {
    return empty()
  }
}

export function saveSession(s: SessionStore) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* private mode etc. — the session just won't survive a reload */
  }
}

/** Add memberships for a trip; the first one given becomes active unless `activate` is false. */
export function withMembers(s: SessionStore, tripId: string, members: Membership[], activate = true): SessionStore {
  const existing = s.trips[tripId] ?? { active: members[0]?.memberId, members: {} }
  const merged = { ...existing.members, ...Object.fromEntries(members.map((m) => [m.memberId, m])) }
  return {
    currentTripId: tripId,
    trips: { ...s.trips, [tripId]: { active: activate && members[0] ? members[0].memberId : existing.active, members: merged } },
  }
}

export function activeMembership(s: SessionStore, tripId: string | null): Membership | null {
  if (!tripId) return null
  const t = s.trips[tripId]
  return t ? t.members[t.active] ?? null : null
}
