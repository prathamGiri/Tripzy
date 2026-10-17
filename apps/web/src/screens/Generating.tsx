/** Starts plan generation on the server and follows the job until the plan is ready (~1 min with AI). */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2 } from 'lucide-react'
import { fmtRange, inr, POPULAR_DESTINATIONS, type JobView } from '@tripzy/shared'
import { gradient } from '../lib/gradients'
import { useTrip } from '../state/TripContext'
import { Button, cx } from '../components/ui'

// Must match STAGES in apps/api/src/modules/plans/service.ts (order matters, text is matched by prefix)
const SERVER_STAGES = ['Reading everyone’s preferences', 'Planning days, stays and travel', 'Fitting everything to the budget', 'Checking hotel prices on the web', 'Adding booking links']

const FUN = [
  'Comparing neighbourhoods to stay in…',
  'Checking which places suit everyone’s food choices…',
  'Balancing chill time and big days…',
  'Pricing trains, flights and buses…',
  'Finding swaps in case the group wants options…',
  'Double-checking the budget maths…',
]

export default function Generating() {
  const nav = useNavigate()
  const { trip, startPlan, getJob, refresh } = useTrip()
  const t = trip!
  const ov = t.overlap
  const popular = POPULAR_DESTINATIONS.find((d) => d.name === t.destinationQuery)
  const [job, setJob] = useState<JobView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const started = useRef(false)
  const attempt = useRef(0)

  const run = async () => {
    setError(null)
    setJob(null)
    const myAttempt = ++attempt.current
    try {
      let j = await startPlan()
      setJob(j)
      while (j.status === 'queued' || j.status === 'running') {
        await new Promise((r) => setTimeout(r, 1500))
        if (attempt.current !== myAttempt) return
        j = await getJob(j.id)
        setJob(j)
      }
      if (j.status === 'failed') throw new Error(j.error ?? 'Planning failed')
      await refresh()
      await new Promise((r) => setTimeout(r, 600))
      nav('/plan', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Planning failed')
    }
  }

  useEffect(() => {
    if (!t.me.isOrganizer) {
      nav('/dashboard', { replace: true })
      return
    }
    if (started.current) return // StrictMode double-mount guard
    started.current = true
    run()
    const i = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stageIdx = job ? SERVER_STAGES.findIndex((s) => job.stage.startsWith(s)) : -1
  const doneAll = job?.status === 'done'
  const steps = [
    `Reading ${ov.respondedCount} sets of preferences`,
    ov.best ? `Dates: ${fmtRange(ov.best.dates[0], ov.best.dates[ov.best.dates.length - 1])} · ${t.destinationQuery ?? 'picking the destination'}` : 'Planning days, stays and travel',
    `Fitting everything under ${inr(ov.budget.min)} per person`,
    'Checking real hotel prices for your dates',
    'Adding booking links',
  ]

  return (
    <div className={`flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br ${gradient(popular?.gradient)} px-6 pt-9 text-white`}>
      <div className="relative">
        {!error && <div className="absolute inset-0 animate-ping rounded-full bg-white/30" />}
        <div className="relative grid h-24 w-24 place-items-center rounded-full bg-white/20 text-5xl backdrop-blur">{error ? '😕' : (popular?.emoji ?? '✨')}</div>
      </div>
      <h1 className="mt-8 text-center text-2xl font-extrabold">{error ? 'Planning hit a snag' : `Planning ${t.name}…`}</h1>
      <p className="mt-1 text-center text-white/85">
        {error ? error : doneAll ? 'Done!' : `${FUN[Math.floor(elapsed / 6) % FUN.length]} · ${elapsed}s`}
      </p>

      {error ? (
        <div className="mt-8 flex w-full max-w-sm flex-col gap-2">
          <Button variant="secondary" onClick={run}>
            Try again
          </Button>
          <button className="py-2 text-sm font-semibold text-white/90" onClick={() => nav('/dashboard')}>
            Back to dashboard
          </button>
        </div>
      ) : (
        <div className="mt-8 w-full max-w-sm space-y-2.5">
          {steps.map((s, i) => {
            const isDone = doneAll || i < stageIdx
            const isNow = !doneAll && i === Math.max(0, stageIdx)
            return (
              <div
                key={i}
                className={cx(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300',
                  isDone ? 'bg-white/20' : isNow ? 'bg-white/10' : 'opacity-40',
                )}
              >
                <div className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full', isDone ? 'bg-white text-brand-600' : 'bg-white/20')}>
                  {isDone ? <Check size={14} strokeWidth={3} /> : isNow ? <Loader2 size={14} className="animate-spin" /> : null}
                </div>
                <div className="text-sm font-semibold">{s}</div>
              </div>
            )
          })}
          <p className="pt-3 text-center text-xs text-white/70">AI plans take about a minute and a half, including checking live hotel prices. You can leave this page — the plan keeps building.</p>
        </div>
      )}
    </div>
  )
}
