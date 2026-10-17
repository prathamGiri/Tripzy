/**
 * App state for the current trip, backed by the API.
 * Screens call these actions; each returns once the server has answered and `trip` is fresh.
 * While a trip is open, it re-fetches every few seconds so friends' answers and votes appear live.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { CreateTripInput, JobView, MemberView, Preferences, TripView, Vote } from '@tripzy/shared'
import { ApiError } from '@tripzy/shared'
import { api } from '../lib/api'
import { activeMembership, loadSession, saveSession, withMembers, type SessionStore } from '../lib/session'

const POLL_MS = 5000

interface Ctx {
  ready: boolean
  trip: TripView | null
  me: MemberView | undefined
  token: string | null
  createTrip: (input: CreateTripInput) => Promise<TripView>
  joinInvite: (code: string, name: string) => Promise<void>
  refresh: () => Promise<void>
  savePrefs: (p: Preferences) => Promise<void>
  startPlan: () => Promise<JobView>
  getJob: (jobId: string) => Promise<JobView>
  vote: (itemId: string, value: Vote | null) => Promise<void>
  swap: (slotId: string, altId: string | null) => Promise<void>
  select: (sel: { stayId?: string; transportId?: string }) => Promise<void>
  lock: () => Promise<void>
  /** Demo: act as another member of this trip. */
  switchMember: (memberId: string) => Promise<void>
  /** Demo: create a sample trip where everyone has answered. */
  quickDemo: () => Promise<void>
  /** Switch to another trip this browser is already a member of. */
  openTrip: (tripId: string) => void
  /** Forget the current trip in this browser. */
  leave: () => void
  isMemberOf: (tripId: string) => boolean
}

const TripCtx = createContext<Ctx | null>(null)

export function TripProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionStore>(loadSession)
  const [trip, setTrip] = useState<TripView | null>(null)
  const [ready, setReady] = useState(false)
  const sessionRef = useRef(session)
  sessionRef.current = session

  const updateSession = useCallback((s: SessionStore) => {
    sessionRef.current = s
    saveSession(s)
    setSession(s)
  }, [])

  const membership = activeMembership(session, session.currentTripId)
  const token = membership?.token ?? null

  const fetchTrip = useCallback(async (tripId: string, tok: string) => {
    try {
      setTrip(await api.getTrip(tripId, tok))
    } catch (e) {
      // Token no longer valid (database reset, removed member): forget this trip locally.
      if (e instanceof ApiError && (e.status === 403 || e.status === 404 || e.status === 401)) {
        const s = { ...sessionRef.current, trips: { ...sessionRef.current.trips } }
        delete s.trips[tripId]
        if (s.currentTripId === tripId) s.currentTripId = null
        updateSession(s)
        setTrip(null)
      } else throw e
    }
  }, [updateSession])

  // Initial load, and whenever the active trip/member changes
  useEffect(() => {
    let cancelled = false
    if (!session.currentTripId || !token) {
      setTrip(null)
      setReady(true)
      return
    }
    fetchTrip(session.currentTripId, token)
      .catch(() => {})
      .finally(() => !cancelled && setReady(true))
    return () => {
      cancelled = true
    }
  }, [session.currentTripId, token, fetchTrip])

  // Live updates
  useEffect(() => {
    if (!trip || !token || trip.locked) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchTrip(trip.id, token).catch(() => {})
    }, POLL_MS)
    return () => clearInterval(id)
  }, [trip?.id, trip?.locked, token, fetchTrip])

  const value = useMemo<Ctx>(() => {
    const need = () => {
      if (!trip || !token) throw new Error('No trip open')
      return { id: trip.id, token }
    }
    return {
      ready,
      trip,
      token,
      me: trip?.members.find((m) => m.id === trip.me.memberId),

      createTrip: async (input) => {
        const res = await api.createTrip(input)
        const org = res.trip.members.find((m) => m.isOrganizer)!
        updateSession(withMembers(sessionRef.current, res.trip.id, [{ memberId: org.id, token: res.token, name: org.name }]))
        setTrip(res.trip)
        return res.trip
      },
      joinInvite: async (code, name) => {
        const m = await api.join(code, name)
        updateSession(withMembers(sessionRef.current, m.tripId, [m]))
        setTrip(await api.getTrip(m.tripId, m.token))
      },
      refresh: async () => {
        const { id, token } = need()
        await fetchTrip(id, token)
      },
      savePrefs: async (p) => {
        const { id, token } = need()
        setTrip(await api.savePrefs(id, p, token))
      },
      startPlan: async () => {
        const { id, token } = need()
        return api.startPlan(id, token)
      },
      getJob: async (jobId) => {
        const { id, token } = need()
        return api.job(id, jobId, token)
      },
      vote: async (itemId, v) => {
        const { id, token } = need()
        setTrip(await api.vote(id, itemId, v, token))
      },
      swap: async (slotId, altId) => {
        const { id, token } = need()
        setTrip(await api.swap(id, slotId, altId, token))
      },
      select: async (sel) => {
        const { id, token } = need()
        setTrip(await api.select(id, sel, token))
      },
      lock: async () => {
        const { id, token } = need()
        setTrip(await api.lock(id, token))
      },
      switchMember: async (memberId) => {
        const { id, token } = need()
        let s = sessionRef.current
        if (!s.trips[id]?.members[memberId]) {
          const all = await api.demoTokens(id, token)
          s = withMembers(s, id, all, false)
        }
        updateSession({ ...s, currentTripId: id, trips: { ...s.trips, [id]: { ...s.trips[id], active: memberId } } })
      },
      quickDemo: async () => {
        const res = await api.demoSample()
        updateSession(withMembers(sessionRef.current, res.tripId, res.tokens))
        setTrip(await api.getTrip(res.tripId, res.tokens[0].token))
      },
      openTrip: (tripId) => {
        if (sessionRef.current.trips[tripId]) updateSession({ ...sessionRef.current, currentTripId: tripId })
      },
      leave: () => {
        updateSession({ ...sessionRef.current, currentTripId: null })
        setTrip(null)
      },
      isMemberOf: (tripId) => !!sessionRef.current.trips[tripId],
    }
  }, [trip, token, ready, fetchTrip, updateSession])

  return <TripCtx.Provider value={value}>{children}</TripCtx.Provider>
}

export function useTrip() {
  const ctx = useContext(TripCtx)
  if (!ctx) throw new Error('useTrip must be used inside TripProvider')
  return ctx
}
