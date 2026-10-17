/**
 * "I've booked it" forms for the stay (organizer) and for a city's travel.
 * Either confirm the suggested option, or enter what you actually booked. Saving updates the itinerary.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { effectiveTransport, type TransportMode } from '@tripzy/shared'
import type { PlanCtx } from '../screens/Plan'
import { useTrip } from '../state/TripContext'
import { useAction, useToast } from './Toast'
import { BottomSheet, Button, Chip, cx } from './ui'

const inputCls = 'w-full rounded-2xl bg-white px-3.5 py-2.5 text-[15px] font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400'

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between text-sm font-bold text-slate-800">
        {label}
        {hint && <span className="text-xs font-normal text-slate-400">{hint}</span>}
      </div>
      {children}
    </label>
  )
}

function ModeSwitch({ mode, setMode, suggestedLabel }: { mode: 'suggested' | 'other'; setMode: (m: 'suggested' | 'other') => void; suggestedLabel: string }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 text-sm font-semibold">
      {(['suggested', 'other'] as const).map((m) => (
        <button key={m} onClick={() => setMode(m)} className={cx('truncate rounded-xl px-2 py-2 transition', mode === m ? 'bg-white shadow-sm' : 'text-slate-500')}>
          {m === 'suggested' ? suggestedLabel : 'Something else'}
        </button>
      ))}
    </div>
  )
}

const num = (s: string) => {
  const n = Number(s.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && s.trim() ? Math.round(n) : undefined
}
const orNull = (s: string) => s.trim() || null

export function StayBookingSheet({ open, mode: initial, p, onClose }: { open: boolean; mode: 'suggested' | 'other'; p: PlanCtx; onClose: () => void }) {
  const { bookStay, unbookStay } = useTrip()
  const [run, busy] = useAction()
  const toast = useToast()
  const booked = p.plan.bookings.stay
  const chosen = p.doc.stays.find((s) => s.id === (booked?.optionId ?? p.plan.stayId)) ?? p.doc.stays[0]
  const [mode, setMode] = useState(initial)
  const [f, setF] = useState({ name: '', area: '', checkin: p.doc.dates[0], checkout: p.doc.dates[p.doc.dates.length - 1], total: '', reference: '', link: '' })
  useEffect(() => {
    if (!open) return
    setMode(initial)
    const custom = booked && !booked.optionId ? booked.stay : null
    setF({
      name: custom?.name ?? '',
      area: custom?.area ?? '',
      checkin: p.doc.dates[0],
      checkout: p.doc.dates[p.doc.dates.length - 1],
      total: custom ? String(custom.roomRate * p.costs.nights) : '',
      reference: booked?.reference ?? '',
      link: booked?.link ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const valid = mode === 'suggested' || (f.name.trim().length >= 2 && num(f.total) != null)

  return (
    <BottomSheet open={open} onClose={onClose} title={booked ? 'Your stay booking' : 'You booked the stay?'}>
      <ModeSwitch mode={mode} setMode={setMode} suggestedLabel={chosen.name} />
      <div className="space-y-3">
        {mode === 'suggested' ? (
          <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
            Marks <b>{chosen.name}</b> as booked for the whole group. The itinerary is updated around it.
          </p>
        ) : (
          <>
            <Field label="Property name">
              <input className={inputCls} value={f.name} onChange={set('name')} placeholder="e.g. Casa Anjuna Villa" maxLength={120} />
            </Field>
            <Field label="Area">
              <input className={inputCls} value={f.area} onChange={set('area')} placeholder="e.g. Assagao" maxLength={120} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Check-in">
                <input type="date" className={inputCls} value={f.checkin} onChange={set('checkin')} />
              </Field>
              <Field label="Check-out">
                <input type="date" className={inputCls} value={f.checkout} min={f.checkin} onChange={set('checkout')} />
              </Field>
            </div>
            <Field label="Total paid (₹)" hint="whole group, all nights">
              <input className={inputCls} inputMode="numeric" value={f.total} onChange={set('total')} placeholder="e.g. 45000" />
            </Field>
          </>
        )}
        <Field label="Booking reference" hint="optional">
          <input className={inputCls} value={f.reference} onChange={set('reference')} maxLength={80} />
        </Field>
        <Field label="Link to the booking" hint="optional">
          <input className={inputCls} value={f.link} onChange={set('link')} placeholder="https://…" maxLength={500} />
        </Field>
      </div>
      <div className="mt-5 space-y-2">
        <Button
          full
          size="lg"
          variant="sea"
          disabled={!valid || busy}
          onClick={() =>
            run(async () => {
              await bookStay(
                mode === 'suggested'
                  ? { optionId: chosen.id, reference: orNull(f.reference), link: orNull(f.link) }
                  : { optionId: null, name: f.name.trim(), area: orNull(f.area), checkin: f.checkin, checkout: f.checkout, totalPrice: num(f.total), reference: orNull(f.reference), link: orNull(f.link) },
              )
              toast('Stay booked — updating the itinerary')
              onClose()
            })
          }
        >
          {busy ? 'Saving…' : 'Save booking'}
        </Button>
        {booked && (
          <button
            className="w-full py-2 text-sm font-semibold text-red-600"
            onClick={() =>
              run(async () => {
                await unbookStay()
                toast('Stay booking removed')
                onClose()
              })
            }
          >
            Remove booking
          </button>
        )}
      </div>
    </BottomSheet>
  )
}

const MODES: { id: TransportMode; label: string }[] = [
  { id: 'train', label: '🚆 Train' },
  { id: 'flight', label: '✈️ Flight' },
  { id: 'bus', label: '🚌 Bus' },
  { id: 'car', label: '🚗 Car' },
]

export function TravelBookingSheet({ open, mode: initial, p, origin, onClose }: { open: boolean; mode: 'suggested' | 'other'; p: PlanCtx; origin: string; onClose: () => void }) {
  const { bookTravel, unbookTravel } = useTrip()
  const [run, busy] = useAction()
  const toast = useToast()
  const booked = p.plan.bookings.travel[origin]
  const chosen = effectiveTransport({ ...p.plan, bookings: { ...p.plan.bookings, travel: {} } }, origin)
  const [mode, setMode] = useState(initial)
  const [f, setF] = useState({ mode: 'train' as TransportMode, label: '', price: '', arrive: '', returnDepart: '', reference: '', link: '' })
  useEffect(() => {
    if (!open) return
    setMode(chosen ? initial : 'other')
    const t = booked?.transport
    setF({
      mode: t?.mode ?? chosen?.mode ?? 'train',
      label: booked && !booked.optionId ? t?.label ?? '' : '',
      price: booked && !booked.optionId && t ? String(t.price * 2) : '',
      arrive: t?.arrive ?? chosen?.arrive ?? '',
      returnDepart: t?.returnDepart ?? '',
      reference: booked?.reference ?? '',
      link: booked?.link ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const valid = (mode === 'suggested' && !!chosen) || (f.label.trim().length >= 2 && num(f.price) != null)
  const time = (s: string) => (/^\d{2}:\d{2}$/.test(s) ? s : null)

  return (
    <BottomSheet open={open} onClose={onClose} title={`Travel from ${origin}`}>
      {chosen && <ModeSwitch mode={mode} setMode={setMode} suggestedLabel={chosen.label} />}
      <div className="space-y-3">
        {mode === 'suggested' && chosen ? (
          <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
            Marks <b>{chosen.label}</b> as booked for everyone travelling from {origin}.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <Chip key={m.id} selected={f.mode === m.id} onClick={() => setF((x) => ({ ...x, mode: m.id }))}>
                  {m.label}
                </Chip>
              ))}
            </div>
            <Field label="Train / flight / bus">
              <input className={inputCls} value={f.label} onChange={set('label')} placeholder="e.g. 12051 Jan Shatabdi or 6E 5123" maxLength={120} />
            </Field>
            <Field label="Price per person (₹)" hint="return, all-in">
              <input className={inputCls} inputMode="numeric" value={f.price} onChange={set('price')} placeholder="e.g. 4800" />
            </Field>
          </>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Arrives" hint="day 1">
            <input type="time" className={inputCls} value={f.arrive} onChange={set('arrive')} />
          </Field>
          <Field label="Return leaves" hint="last day">
            <input type="time" className={inputCls} value={f.returnDepart} onChange={set('returnDepart')} />
          </Field>
        </div>
        <Field label="PNR / booking reference" hint="optional">
          <input className={inputCls} value={f.reference} onChange={set('reference')} maxLength={80} />
        </Field>
        <Field label="Link to the booking" hint="optional">
          <input className={inputCls} value={f.link} onChange={set('link')} placeholder="https://…" maxLength={500} />
        </Field>
        <p className="text-xs text-slate-400">Arrival and return times let us start Day 1 after everyone arrives and end the last day in time.</p>
      </div>
      <div className="mt-5 space-y-2">
        <Button
          full
          size="lg"
          variant="sea"
          disabled={!valid || busy}
          onClick={() =>
            run(async () => {
              const common = { arriveTime: time(f.arrive), returnDepartTime: time(f.returnDepart), reference: orNull(f.reference), link: orNull(f.link) }
              await bookTravel(
                origin,
                mode === 'suggested' && chosen
                  ? { optionId: chosen.id, ...common }
                  : { optionId: null, mode: f.mode, label: f.label.trim(), pricePerPersonReturn: num(f.price), ...common },
              )
              toast('Travel booked — updating the itinerary')
              onClose()
            })
          }
        >
          {busy ? 'Saving…' : 'Save booking'}
        </Button>
        {booked && (
          <button
            className="w-full py-2 text-sm font-semibold text-red-600"
            onClick={() =>
              run(async () => {
                await unbookTravel(origin)
                toast('Travel booking removed')
                onClose()
              })
            }
          >
            Remove booking
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
