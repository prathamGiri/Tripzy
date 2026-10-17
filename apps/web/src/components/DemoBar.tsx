import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BatteryFull, ChevronDown, LogOut, Signal, Wifi } from 'lucide-react'
import { DEMO_TOOLS } from '../lib/api'
import { useTrip } from '../state/TripContext'
import { Avatar, BottomSheet, cx } from './ui'
import { useAction, useToast } from './Toast'

const JUMPS = [
  { to: '/', label: 'Landing' },
  { to: '/new', label: 'Create trip' },
  { to: '/invite', label: 'Invite link' },
  { to: '/join', label: 'Preference form' },
  { to: '/dashboard', label: 'Group dashboard' },
  { to: '/plan', label: 'Trip plan' },
  { to: '/locked', label: 'Trip locked' },
]

const IN_FRAME = typeof window !== 'undefined' && window.self !== window.top

/** Inside the video stage's phone frame: a fake phone status bar, plus a hook the recorder uses to switch person. */
function PhoneStatusBar() {
  const { trip, switchMember } = useTrip()
  useEffect(() => {
    // The demo recorder calls window.__setUser('Kabir') to act as another member.
    ;(window as unknown as { __setUser: (nameOrId: string) => Promise<void> }).__setUser = async (nameOrId) => {
      const m = trip?.members.find((x) => x.id === nameOrId || x.name === nameOrId)
      if (m) await switchMember(m.id)
    }
  }, [trip, switchMember])
  return (
    <div className="fixed inset-x-0 top-0 z-40 flex h-9 items-center justify-between bg-slate-50/85 px-6 text-[13px] font-bold text-slate-900 backdrop-blur">
      <span>9:41</span>
      <span className="flex items-center gap-1.5">
        <Signal size={14} strokeWidth={2.5} />
        <Wifi size={14} strokeWidth={2.5} />
        <BatteryFull size={18} strokeWidth={2} />
      </span>
    </div>
  )
}

/** Demo controls: switch who you are, jump between screens, leave the trip. Not part of the product. */
export function DemoBar() {
  const { trip } = useTrip()
  if (IN_FRAME) return <PhoneStatusBar />
  if (!DEMO_TOOLS || (trip && !trip.demo)) return null
  return <DemoControls />
}

function DemoControls() {
  const { trip, me, switchMember, leave } = useTrip()
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const toast = useToast()
  const [run] = useAction()

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-9 items-center justify-between gap-2 bg-slate-900 px-3 text-xs text-slate-300">
        <span className="flex items-center gap-1.5 font-semibold tracking-wide text-amber-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" /> DEMO
        </span>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-full bg-white/10 py-0.5 pl-0.5 pr-2.5 text-white hover:bg-white/15">
          {me ? <Avatar member={me} size={22} /> : <span className="pl-2">🎬</span>}
          <span className="font-medium">{me ? `Viewing as ${me.name}${me.isOrganizer ? ' (organizer)' : ''}` : 'Demo controls'}</span>
          <ChevronDown size={14} />
        </button>
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Demo controls">
        {trip ? (
          <>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Switch person</div>
            <div className="space-y-1.5">
              {trip.members.map((m) => (
                <button
                  key={m.id}
                  onClick={() =>
                    run(async () => {
                      await switchMember(m.id)
                      setOpen(false)
                      toast(`Now viewing as ${m.name}`)
                      if (!m.responded && !trip.plan && loc.pathname !== '/join') nav('/join')
                    })
                  }
                  className={cx(
                    'flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition',
                    m.id === me?.id ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50',
                  )}
                >
                  <Avatar member={m} size={36} />
                  <div className="flex-1">
                    <div className="font-semibold">
                      {m.name} {m.isOrganizer && <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">organizer</span>}
                    </div>
                    <div className="text-xs text-slate-500">{m.responded ? '✅ Preferences in' : '⏳ Hasn’t responded yet'}</div>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">Friends who join through the invite link appear here too.</p>
          </>
        ) : (
          <p className="mb-2 text-sm text-slate-500">Create a trip first — then you can switch between the organizer and friends here.</p>
        )}

        <div className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Jump to screen</div>
        <div className="flex flex-wrap gap-1.5">
          {JUMPS.map((j) => (
            <button
              key={j.to}
              onClick={() => {
                nav(j.to)
                setOpen(false)
              }}
              className={cx(
                'rounded-full px-3 py-1.5 text-sm',
                loc.pathname === j.to ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              )}
            >
              {j.label}
            </button>
          ))}
        </div>

        {trip && (
          <button
            onClick={() => {
              leave()
              setOpen(false)
              nav('/')
              toast('Left the trip on this device')
            }}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <LogOut size={16} /> Start over (leave this trip)
          </button>
        )}
      </BottomSheet>
    </>
  )
}
