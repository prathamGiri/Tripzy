import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronLeft, Lock, Timer } from 'lucide-react'
import {
  dayName, dayNum, fmtRange, FOOD_OPTIONS, inr, INTERESTS, LOCAL_ORIGIN, monthName, ORIGINS, parseDate, POPULAR_DESTINATIONS, STYLES,
  type Interest, type Preferences, type Style,
} from '@tripzy/shared'
import { gradient } from '../lib/gradients'
import { useTrip } from '../state/TripContext'
import { useAction } from '../components/Toast'
import { Avatar, AvatarStack, BottomBar, Button, Card, Chip, ProgressBar, cx } from '../components/ui'

const STEPS = ['Budget', 'From', 'Style', 'Interests', 'Food', 'Dates'] as const
const BUDGET_PRESETS = [10000, 15000, 20000, 30000, 50000]

export default function PreferenceForm() {
  const { me } = useTrip()
  return me ? <Form key={me.id} /> : null
}

function Form() {
  const nav = useNavigate()
  const location = useLocation()
  const { trip, me, savePrefs } = useTrip()
  const [run, busy] = useAction()
  const t = trip!
  const m = me!
  const saved = t.me.prefs
  const organizer = t.members.find((x) => x.isOrganizer)!
  const dest = POPULAR_DESTINATIONS.find((d) => d.name === t.destinationQuery)
  const window = t.overlap.windowDates
  const skipWelcome = m.isOrganizer || !!saved || !!(location.state as { skipWelcome?: boolean } | null)?.skipWelcome

  const [step, setStep] = useState(skipWelcome ? 0 : -1) // -1 = welcome
  const [done, setDone] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(skipWelcome ? Date.now() : null)
  const [now, setNow] = useState(Date.now())
  // Friends start with the group's usual city pre-selected; the organizer picks their own.
  const suggestedOrigin = m.isOrganizer ? undefined : t.origin || undefined
  const [p, setP] = useState<Preferences>({ origin: suggestedOrigin, ...(saved ?? { budget: 20000, style: 'relaxed', interests: [], food: [], dates: [] }) })
  const [otherCity, setOtherCity] = useState(saved?.origin && ![...ORIGINS, LOCAL_ORIGIN].includes(saved.origin) ? saved.origin : '')
  const [styleTouched, setStyleTouched] = useState(!!saved)

  useEffect(() => {
    if (done || startedAt === null) return
    const i = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(i)
  }, [done, startedAt])

  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0
  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`

  const canNext = [true, !!p.origin?.trim(), styleTouched, p.interests.length > 0, true, p.dates.length > 0][step] ?? true
  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1)
    else
      run(async () => {
        await savePrefs({ ...p, completedInSec: elapsed })
        setDone(true)
      })
  }

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  /* ---------- welcome ---------- */
  if (step === -1) {
    return (
      <div className="flex min-h-[calc(100dvh-36px)] animate-fade-up flex-col pt-6">
        <div className={`rounded-[2rem] bg-gradient-to-br ${gradient(dest?.gradient)} p-6 text-white shadow-lift`}>
          <div className="flex items-center gap-2 text-sm font-medium opacity-90">
            <Avatar member={organizer} size={28} ring /> {organizer.name} invited you
          </div>
          <div className="mt-5 text-5xl">{dest?.emoji ?? (t.destinationQuery ? '📍' : '✨')}</div>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight">{t.name}</h1>
          <div className="mt-1 opacity-90">
            {t.destinationQuery ?? 'Destination picked by the group'} · {t.days} days · sometime {fmtRange(t.windowStart, t.windowEnd)}
          </div>
          <div className="mt-5 flex items-center gap-2 text-sm">
            <AvatarStack members={t.members} size={26} />
            <span className="opacity-90">{t.overlap.respondedCount} of {t.groupSize} already in</span>
          </div>
        </div>
        <div className="mt-6 space-y-3 px-1">
          <h2 className="text-xl font-bold">Hey {m.name} 👋 — 5 quick questions</h2>
          <p className="text-slate-600">Tell us your budget, vibe and free dates. We’ll plan a trip that works for everyone — no endless group chat.</p>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">⏱ ~90 seconds</span>
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">🙅 No sign-up</span>
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">🔒 Budget stays private</span>
          </div>
        </div>
        <div className="flex-1" />
        <BottomBar>
          <Button
            full
            size="lg"
            onClick={() => {
              setStartedAt(Date.now())
              setNow(Date.now())
              setStep(0)
            }}
          >
            Let’s go <ArrowRight size={18} />
          </Button>
        </BottomBar>
      </div>
    )
  }

  /* ---------- done ---------- */
  if (done) {
    const respondedCount = t.overlap.respondedCount
    return (
      <div className="flex min-h-[calc(100dvh-36px)] animate-fade-up flex-col items-center pt-16 text-center">
        <div className="grid h-24 w-24 animate-pop place-items-center rounded-full bg-sea-500 text-5xl text-white shadow-lift">✓</div>
        <h1 className="mt-6 text-3xl font-extrabold">You’re in, {m.name}!</h1>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 font-bold text-amber-800">⚡ Done in {clock}</div>
        <p className="mt-5 max-w-xs text-slate-600">
          {respondedCount} of {t.groupSize} friends have answered. We’ll ping you the moment the plan is ready.
        </p>
        <Card className="mt-6 w-full text-left">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your answers</div>
          <div className="mt-2 grid grid-cols-2 gap-y-2 text-sm">
            <div className="text-slate-500">Budget</div>
            <div className="font-semibold">{inr(p.budget)}</div>
            <div className="text-slate-500">From</div>
            <div className="font-semibold">{p.origin === LOCAL_ORIGIN ? 'Already there' : p.origin}</div>
            <div className="text-slate-500">Style</div>
            <div className="font-semibold">{STYLES.find((s) => s.id === p.style)?.emoji} {STYLES.find((s) => s.id === p.style)?.label}</div>
            <div className="text-slate-500">Interests</div>
            <div className="font-semibold">{p.interests.map((i) => INTERESTS.find((x) => x.id === i)?.emoji).join(' ')}</div>
            <div className="text-slate-500">Free</div>
            <div className="font-semibold">{p.dates.length} days</div>
          </div>
        </Card>
        <div className="flex-1" />
        <BottomBar>
          <Button full size="lg" onClick={() => nav('/dashboard')}>
            See the group’s progress <ArrowRight size={18} />
          </Button>
          <button onClick={() => { setDone(false); setStep(0) }} className="mt-2 w-full py-2 text-sm font-semibold text-slate-500">
            Edit my answers
          </button>
        </BottomBar>
      </div>
    )
  }

  /* ---------- steps ---------- */
  const othersFree = (d: string) =>
    (t.overlap.dateCounts.find((c) => c.date === d)?.count ?? 0) - (saved?.dates.includes(d) ? 1 : 0)
  const firstDow = parseDate(window[0]).getDay()

  return (
    <div className="flex min-h-[calc(100dvh-36px)] flex-col">
      <div className="sticky top-9 z-10 -mx-4 bg-slate-50/90 px-4 pb-3 pt-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            onClick={() => (step === 0 ? nav(-1) : setStep(step - 1))}
            className="-ml-2 grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-200/60"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 text-sm font-semibold text-slate-500">
            Step {step + 1} of {STEPS.length} · <span className="text-slate-800">{STEPS[step]}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold tabular-nums text-slate-700 ring-1 ring-slate-200">
            <Timer size={13} className="text-brand-500" /> {clock}
          </div>
        </div>
        <ProgressBar value={(step + 1) / STEPS.length} className="mt-2" />
      </div>

      <div key={step} className="flex-1 animate-fade-up pt-4">
        {step === 0 && (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">What’s your budget?</h1>
            <p className="mt-1 text-slate-500">Per person, all-in: travel, stay, food and activities.</p>
            <Card className="mt-6 text-center">
              <div className="text-5xl font-extrabold tabular-nums tracking-tight">{inr(p.budget)}</div>
              <div className="mt-1 text-sm text-slate-500">≈ {inr(p.budget / t.days)} per day</div>
              <input
                type="range"
                min={5000}
                max={60000}
                step={500}
                value={p.budget}
                onChange={(e) => setP({ ...p, budget: +e.target.value })}
                className="mt-6 w-full"
              />
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>₹5k</span>
                <span>₹60k</span>
              </div>
            </Card>
            <div className="mt-4 flex flex-wrap gap-2">
              {BUDGET_PRESETS.map((b) => (
                <Chip key={b} selected={p.budget === b} onClick={() => setP({ ...p, budget: b })}>
                  {inr(b)}
                </Chip>
              ))}
            </div>
            <div className="mt-5 flex items-start gap-2 rounded-2xl bg-sea-50 p-3 text-sm text-sea-800">
              <Lock size={16} className="mt-0.5 shrink-0" />
              Your exact number stays private. The group only sees the overall range, so nobody feels awkward.
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">Where are you travelling from?</h1>
            <p className="mt-1 text-slate-500">We’ll plan your trains and flights from here — everyone can start somewhere different.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {ORIGINS.map((o) => (
                <Chip
                  key={o}
                  selected={p.origin === o && !otherCity}
                  onClick={() => {
                    setOtherCity('')
                    setP((q) => ({ ...q, origin: o }))
                  }}
                >
                  {o}
                </Chip>
              ))}
              <Chip
                selected={p.origin === LOCAL_ORIGIN}
                onClick={() => {
                  setOtherCity('')
                  setP((q) => ({ ...q, origin: LOCAL_ORIGIN }))
                }}
              >
                📍 I’m already there
              </Chip>
            </div>
            <label className="mt-4 block">
              <div className="mb-1.5 text-sm font-bold text-slate-800">Somewhere else?</div>
              <input
                className="w-full rounded-2xl bg-white px-4 py-3 text-[15px] font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400"
                placeholder="Type your city, e.g. Indore"
                value={otherCity}
                maxLength={60}
                onChange={(e) => {
                  setOtherCity(e.target.value)
                  setP((q) => ({ ...q, origin: e.target.value.trim() || suggestedOrigin }))
                }}
              />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">What’s your travel style?</h1>
            <p className="mt-1 text-slate-500">Pick the one that sounds most like you.</p>
            <div className="mt-5 space-y-2.5">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setP({ ...p, style: s.id as Style })
                    setStyleTouched(true)
                    setTimeout(() => setStep(3), 280)
                  }}
                  className={cx(
                    'flex w-full items-center gap-4 rounded-3xl p-4 text-left transition active:scale-[.98]',
                    styleTouched && p.style === s.id ? 'bg-brand-500 text-white shadow-lift' : 'bg-white ring-1 ring-slate-200',
                  )}
                >
                  <div className="text-3xl">{s.emoji}</div>
                  <div>
                    <div className="font-bold">{s.label}</div>
                    <div className={cx('text-sm', styleTouched && p.style === s.id ? 'text-white/85' : 'text-slate-500')}>{s.blurb}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">What are you into?</h1>
            <p className="mt-1 text-slate-500">Pick as many as you like.</p>
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              {INTERESTS.map((i) => {
                const on = p.interests.includes(i.id)
                return (
                  <button
                    key={i.id}
                    onClick={() => setP((q) => ({ ...q, interests: toggle<Interest>(q.interests, i.id) }))}
                    className={cx(
                      'flex aspect-square flex-col items-center justify-center gap-1 rounded-3xl transition active:scale-95',
                      on ? 'bg-brand-500 text-white shadow-lift' : 'bg-white ring-1 ring-slate-200',
                    )}
                  >
                    <span className="text-3xl">{i.emoji}</span>
                    <span className="text-sm font-semibold">{i.label}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">Any food restrictions?</h1>
            <p className="mt-1 text-slate-500">We’ll make sure every meal works for you.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Chip selected={p.food.length === 0} onClick={() => setP({ ...p, food: [] })}>
                😋 I eat everything
              </Chip>
              {FOOD_OPTIONS.map((f) => (
                <Chip key={f} selected={p.food.includes(f)} onClick={() => setP((q) => ({ ...q, food: toggle(q.food, f) }))}>
                  {f}
                </Chip>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">When are you free?</h1>
            <p className="mt-1 text-slate-500">Tap every day you could travel. The numbers show how many friends are free.</p>
            <Card className="mt-5 !p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="font-bold">
                  {monthName(window[0])}
                  {monthName(window[0]) !== monthName(window[window.length - 1]) && ` – ${monthName(window[window.length - 1])}`}
                </div>
                <div className="flex gap-1">
                  <button className="rounded-full px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50" onClick={() => setP({ ...p, dates: window })}>
                    I’m flexible
                  </button>
                  <button className="rounded-full px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100" onClick={() => setP({ ...p, dates: [] })}>
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="pb-1 text-[11px] font-semibold text-slate-400">{d}</div>
                ))}
                {Array.from({ length: firstDow }).map((_, i) => <div key={'e' + i} />)}
                {window.map((d) => {
                  const on = p.dates.includes(d)
                  const n = othersFree(d)
                  return (
                    <button
                      key={d}
                      onClick={() => setP((q) => ({ ...q, dates: toggle(q.dates, d) }))}
                      className={cx(
                        'flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-bold transition active:scale-90',
                        on ? 'bg-brand-500 text-white' : 'bg-slate-50 text-slate-800 ring-1 ring-slate-200',
                      )}
                      title={`${dayName(d)} · ${n} friends free`}
                    >
                      {dayNum(d)}
                      {n > 0 && <span className={cx('text-[9px] font-semibold leading-none', on ? 'text-white/80' : 'text-sea-600')}>{n}👤</span>}
                    </button>
                  )
                })}
              </div>
            </Card>
            <div className="mt-3 text-center text-sm text-slate-500">
              {p.dates.length ? `${p.dates.length} days selected` : 'Pick at least one day'}
            </div>
          </>
        )}
      </div>

      {step !== 2 && (
        <BottomBar>
          <Button full size="lg" disabled={!canNext || busy} onClick={next}>
            {step === STEPS.length - 1 ? (busy ? 'Saving…' : 'Submit — I’m in!') : 'Next'} <ArrowRight size={18} />
          </Button>
        </BottomBar>
      )}
    </div>
  )
}
