import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { dateRange, fmtRange, POPULAR_DESTINATIONS, type CreateTripInput } from '@tripzy/shared'
import { DEMO_TOOLS } from '../lib/api'
import { gradient } from '../lib/gradients'
import { useTrip } from '../state/TripContext'
import { useAction } from '../components/Toast'
import { BottomBar, Button, Card, Chip, PageHeader, Stepper, cx } from '../components/ui'

const PRESETS = [
  { label: '🎄 Christmas week', start: '2026-12-19', end: '2026-12-27' },
  { label: '🎆 New Year', start: '2026-12-28', end: '2027-01-04' },
  { label: '🗓️ Mid-Dec', start: '2026-12-12', end: '2026-12-22' },
  { label: '🇮🇳 Republic Day long weekend', start: '2027-01-22', end: '2027-01-27' },
]

const DEFAULTS: CreateTripInput = {
  name: 'Goa with the gang',
  organizerName: 'Arjun',
  destinationQuery: 'Goa',
  windowStart: '2026-12-12',
  windowEnd: '2026-12-22',
  days: 4,
  groupSize: 6,
  seedDemoFriends: DEMO_TOOLS,
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-sm font-bold text-slate-800">{label}</div>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-2xl bg-white px-4 py-3 text-[15px] font-medium ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-brand-400'

export default function CreateTrip() {
  const nav = useNavigate()
  const { createTrip } = useTrip()
  const [run, busy] = useAction()
  const [f, setF] = useState<CreateTripInput>(DEFAULTS)
  const set = <K extends keyof CreateTripInput>(k: K, v: CreateTripInput[K]) => setF((p) => ({ ...p, [k]: v }))
  const isPopular = POPULAR_DESTINATIONS.some((d) => d.name === f.destinationQuery)
  const [custom, setCustom] = useState('')

  const windowLen = dateRange(f.windowStart, f.windowEnd).length
  const maxDays = Math.min(10, Math.max(2, windowLen))
  const days = Math.min(f.days, maxDays)
  const valid = f.name.trim() && f.organizerName.trim() && (f.destinationQuery === null || f.destinationQuery.trim().length >= 2)

  return (
    <div className="animate-fade-up">
      <PageHeader back="/" title="New trip" sub="Takes about a minute" />

      <div className="space-y-6 pt-2">
        <Field label="Trip name">
          <input className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Goa with the gang" />
        </Field>

        <Field label="Your name" hint="Friends will see this">
          <input className={inputCls} value={f.organizerName} onChange={(e) => set('organizerName', e.target.value)} />
        </Field>

        <Field label="Where to?">
          <div className="grid grid-cols-2 gap-2.5">
            {POPULAR_DESTINATIONS.slice(0, 5).map((d) => (
              <button
                key={d.name}
                onClick={() => set('destinationQuery', d.name)}
                className={cx(
                  'relative overflow-hidden rounded-3xl bg-gradient-to-br p-3.5 text-left text-white transition active:scale-[.98]',
                  gradient(d.gradient),
                  f.destinationQuery === d.name ? 'ring-4 ring-brand-500 ring-offset-2' : 'opacity-90',
                )}
              >
                <div className="text-3xl">{d.emoji}</div>
                <div className="mt-2 text-lg font-extrabold">{d.name}</div>
                <div className="text-xs leading-snug opacity-90">{d.tagline}</div>
                {f.destinationQuery === d.name && <div className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-white text-sm text-brand-600">✓</div>}
              </button>
            ))}
            <button
              onClick={() => set('destinationQuery', null)}
              className={cx(
                'relative rounded-3xl border-2 border-dashed p-3.5 text-left transition active:scale-[.98]',
                f.destinationQuery === null ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white',
              )}
            >
              <div className="text-3xl">✨</div>
              <div className="mt-2 text-lg font-extrabold">Suggest one</div>
              <div className="text-xs leading-snug text-slate-500">AI picks the best fit for everyone</div>
              {f.destinationQuery === null && <div className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-sm text-white">✓</div>}
            </button>
          </div>
          <label className={cx('mt-2.5 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 ring-1 transition', f.destinationQuery && !isPopular ? 'ring-2 ring-brand-500' : 'ring-slate-200')}>
            <Search size={18} className="text-slate-400" />
            <input
              className="flex-1 bg-transparent text-[15px] font-medium outline-none"
              placeholder="Somewhere else? e.g. Kerala, Ladakh, Hampi"
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value)
                set('destinationQuery', e.target.value.trim() ? e.target.value : 'Goa')
              }}
            />
          </label>
        </Field>

        <Field label="Rough dates" hint="Friends pick exact days they’re free">
          <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
            {PRESETS.map((p) => (
              <Chip
                key={p.label}
                className="shrink-0"
                selected={f.windowStart === p.start && f.windowEnd === p.end}
                onClick={() => setF((x) => ({ ...x, windowStart: p.start, windowEnd: p.end }))}
              >
                {p.label}
              </Chip>
            ))}
          </div>
          <Card className="!p-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="rounded-2xl bg-slate-50 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">From</div>
                <input type="date" className="w-full bg-transparent font-semibold outline-none" value={f.windowStart} onChange={(e) => e.target.value && set('windowStart', e.target.value)} />
              </label>
              <label className="rounded-2xl bg-slate-50 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">To</div>
                <input type="date" className="w-full bg-transparent font-semibold outline-none" value={f.windowEnd} min={f.windowStart} onChange={(e) => e.target.value && set('windowEnd', e.target.value)} />
              </label>
            </div>
            <div className="mt-2 px-1 text-xs text-slate-500">
              Window: <b>{fmtRange(f.windowStart, f.windowEnd)}</b> · {windowLen} days to choose from
            </div>
          </Card>
        </Field>

        <Card className="divide-y divide-slate-100 !py-1">
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="font-bold">Trip length</div>
              <div className="text-xs text-slate-500">including travel days</div>
            </div>
            <Stepper value={days} min={2} max={maxDays} onChange={(v) => set('days', v)} suffix="days" />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="font-bold">Group size</div>
              <div className="text-xs text-slate-500">including you</div>
            </div>
            <Stepper value={f.groupSize} min={2} max={20} onChange={(v) => set('groupSize', v)} suffix="people" />
          </div>
        </Card>

        {DEMO_TOOLS && (
          <label className="flex items-center gap-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
            <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={!!f.seedDemoFriends} onChange={(e) => set('seedDemoFriends', e.target.checked)} />
            <span>
              <b>Demo:</b> add sample friends (3 already answered, 2 pending)
            </span>
          </label>
        )}
      </div>

      <BottomBar>
        <Button
          full
          size="lg"
          disabled={!valid || busy}
          onClick={() =>
            run(async () => {
              await createTrip({ ...f, days, destinationQuery: f.destinationQuery?.trim() || null })
              nav('/invite')
            })
          }
        >
          {busy ? 'Creating…' : 'Create trip & get invite link'} <ArrowRight size={18} />
        </Button>
      </BottomBar>
    </div>
  )
}
