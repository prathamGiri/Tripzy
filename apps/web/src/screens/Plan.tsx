import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight, Bus, Car, Check, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Info, Loader2, Lock, Plane, RefreshCw, Star,
  ThumbsDown, ThumbsUp, Train,
} from 'lucide-react'
import {
  agreement,
  applySwaps,
  effectiveStay,
  effectiveTransport,
  fmtDate,
  fmtMins,
  fmtRange,
  inr,
  LOCAL_ORIGIN,
  mapsLink,
  personalCost,
  TAG_META,
  tally,
  votableIds,
  type BookingLink,
  type ChangeInfo,
  type ResolvedItem,
  type Stay,
  type Tag,
  type TransportMode,
  type TransportOption,
  type TripView,
} from '@tripzy/shared'
import { gradient } from '../lib/gradients'
import { ago } from '../lib/time'
import { useTrip } from '../state/TripContext'
import { useAction, useToast } from '../components/Toast'
import { Avatar, BottomBar, BottomSheet, Button, Card, cx } from '../components/ui'
import { StayBookingSheet, TravelBookingSheet } from '../components/BookingSheets'

type TabId = 'itinerary' | 'stay' | 'travel' | 'cost'
const TABS: { id: TabId; label: string }[] = [
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'stay', label: 'Stay' },
  { id: 'travel', label: 'Travel' },
  { id: 'cost', label: 'Cost' },
]

/** Everything the plan tabs need, derived once from the trip — personal to the viewer's starting city. */
function usePlan(t: TripView) {
  const plan = t.plan!
  const doc = plan.doc
  const days = applySwaps(doc.days, plan.swaps)
  const stay = effectiveStay(plan)
  const origin = t.me.origin
  const transport = effectiveTransport(plan, origin)
  const costs = personalCost(plan, origin)
  // What everyone else pays depends on their city: show the range.
  const totals = [...doc.travel.map((g) => personalCost(plan, g.origin).total), ...(t.overlap.origins.some((o) => o.key === LOCAL_ORIGIN) ? [personalCost(plan, LOCAL_ORIGIN).total] : [])]
  const range = { min: Math.min(...totals, costs.total), max: Math.max(...totals, costs.total) }
  const nameOf = (id: string) => t.members.find((m) => m.id === id)?.name ?? 'Someone'
  return { t, plan, doc, days, stay, origin, transport, costs, range, ov: t.overlap, nameOf }
}
type P = ReturnType<typeof usePlan>

export default function Plan() {
  const nav = useNavigate()
  const toast = useToast()
  const [run, busy] = useAction()
  const { trip, me, lock, switchMember } = useTrip()
  const t = trip!
  const p = usePlan(t)
  const { doc, days, costs } = p
  const [tab, setTab] = useState<TabId>('itinerary')
  const [swapItem, setSwapItem] = useState<ResolvedItem | null>(null)

  const votable = votableIds(days, p.stay.id)
  const agree = agreement(p.plan.votes, votable)
  const myVotes = votable.filter((id) => me && p.plan.votes[id]?.[me.id]).length
  const myBudget = t.me.prefs?.budget ?? null
  const organizer = t.members.find((m) => m.isOrganizer)!

  return (
    <div className="-mx-4">
      {/* Hero */}
      <div className={`relative bg-gradient-to-br ${gradient(doc.destination.gradient)} px-4 pb-6 pt-3 text-white`}>
        <div className="flex items-center justify-between">
          <button onClick={() => nav('/dashboard')} className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" aria-label="Back">
            <ChevronLeft size={22} />
          </button>
          <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
            {doc.source === 'ai' ? `✨ AI plan from ${doc.generatedWith} of ${t.groupSize} responses` : '🧪 Sample plan (offline mode)'}
          </div>
        </div>
        <div className="mt-3 text-4xl">{doc.destination.emoji}</div>
        <h1 className="mt-1 text-3xl font-extrabold leading-tight">{t.name}</h1>
        <div className="mt-1 text-white/90">
          {doc.destination.name} · {fmtRange(doc.dates[0], doc.dates[doc.dates.length - 1])} · {days.length} days · {t.groupSize} people
        </div>
        <div className="text-sm text-white/75">{doc.destination.region}</div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
            <div className="text-xs text-white/80">Your cost, all-in</div>
            <div className="text-2xl font-extrabold tabular-nums">{inr(costs.total)}</div>
            <div className="mt-0.5 text-xs font-semibold">
              {myBudget != null
                ? costs.total <= myBudget
                  ? `✓ ${inr(myBudget - costs.total)} under your budget`
                  : `⚠ ${inr(costs.total - myBudget)} over your budget`
                : p.origin === LOCAL_ORIGIN
                  ? 'No travel needed'
                  : `incl. travel from ${p.origin}`}
            </div>
          </div>
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
            <div className="text-xs text-white/80">Group agreement</div>
            <div className="text-2xl font-extrabold tabular-nums">{agree}%</div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${agree}%` }} />
            </div>
          </div>
        </div>
        {p.range.max > p.range.min && (
          <div className="mt-2 text-xs text-white/80">
            Others pay {inr(p.range.min)}–{inr(p.range.max)} depending on where they travel from.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="sticky top-9 z-20 border-b border-slate-200 bg-slate-50/95 px-4 backdrop-blur">
        <div className="flex">
          {TABS.map((x) => (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              className={cx('relative flex-1 py-3 text-sm font-bold transition', tab === x.id ? 'text-slate-900' : 'text-slate-400')}
            >
              {x.label}
              {tab === x.id && <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-brand-500" />}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        <UpdateBanner p={p} />

        {me && !t.locked && tab === 'itinerary' && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-white p-3 text-sm ring-1 ring-slate-200">
            <Avatar member={me} size={28} />
            <div className="flex-1 text-slate-600">
              <b className="text-slate-900">{me.name}</b>, tap 👍 / 👎 or swap anything. <span className="text-slate-400">You’ve voted on {myVotes}.</span>
            </div>
          </div>
        )}

        <div key={tab} className="animate-fade-up">
          {tab === 'itinerary' && <Itinerary p={p} onSwap={setSwapItem} />}
          {tab === 'stay' && <StayTab p={p} />}
          {tab === 'travel' && <TravelTab p={p} />}
          {tab === 'cost' && <CostTab p={p} />}
        </div>

        <BottomBar>
          {t.locked ? (
            <Button full size="lg" variant="dark" onClick={() => nav('/locked')}>
              🔒 Trip locked · view summary & book
            </Button>
          ) : t.me.isOrganizer ? (
            <Button
              full
              size="lg"
              variant="dark"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await lock()
                  nav('/locked')
                })
              }
            >
              <Lock size={18} /> Lock the trip · {agree}% agree
            </Button>
          ) : (
            <div className="rounded-2xl bg-white p-3 text-center text-sm text-slate-600 shadow-soft ring-1 ring-slate-200">
              ✓ Your votes are saved. {organizer.name} locks the plan.{' '}
              {t.demo && (
                <button
                  className="font-semibold text-brand-600"
                  onClick={() =>
                    run(async () => {
                      await switchMember(organizer.id)
                      toast(`Now viewing as ${organizer.name}`)
                    })
                  }
                >
                  Switch to {organizer.name}
                </button>
              )}
            </div>
          )}
        </BottomBar>
      </div>

      <SwapSheet p={p} item={swapItem} onClose={() => setSwapItem(null)} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

/** "Why this pick" lives behind an ⓘ: tap to expand in place (works on phones, unlike hover tooltips). */
function WhyToggle({ why, children }: { why: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false)
  if (!why) return <>{children}</>
  return (
    <>
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">{children}</div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setOpen((o) => !o)
          }}
          className={cx('-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-full transition', open ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:bg-slate-100')}
          aria-label={open ? 'Hide why' : 'Why this?'}
          aria-expanded={open}
        >
          <Info size={16} />
        </button>
      </div>
      {open && <p className="mt-1.5 animate-fade-up rounded-xl bg-slate-50 px-2.5 py-2 text-sm text-slate-600">{why}</p>}
    </>
  )
}

function ByLine({ p, info, verb }: { p: P; info: ChangeInfo | null | undefined; verb: string }) {
  if (!info) return null
  return (
    <div className="mt-1 text-xs text-slate-500">
      {verb} by <b className="text-slate-700">{p.nameOf(info.memberId)}</b> · {ago(info.at)}
    </div>
  )
}

function VoteBar({ id, compact }: { id: string; compact?: boolean }) {
  const { trip, me, vote } = useTrip()
  const [run] = useAction()
  const t = trip!
  const v = t.plan?.votes[id] ?? {}
  const { up, down } = tally(v)
  const mine = me ? v[me.id] : undefined
  const voters = t.members.filter((m) => v[m.id])

  const btn = (kind: 'up' | 'down') => (
    <button
      onClick={() => run(() => vote(id, mine === kind ? null : kind))}
      disabled={t.locked}
      className={cx(
        'flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold transition active:scale-90',
        mine === kind ? (kind === 'up' ? 'bg-sea-600 text-white' : 'bg-red-500 text-white') : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      )}
      aria-label={kind === 'up' ? 'Thumbs up' : 'Thumbs down'}
    >
      {kind === 'up' ? <ThumbsUp size={13} /> : <ThumbsDown size={13} />} {kind === 'up' ? up : down}
    </button>
  )

  return (
    <div className="flex items-center gap-1.5">
      {btn('up')}
      {btn('down')}
      {!compact && voters.length > 0 && (
        <div className="ml-1 flex -space-x-1.5">
          {voters.slice(0, 4).map((m) => (
            <div key={m.id} className="relative">
              <Avatar member={m} size={20} ring />
              <span className="absolute -bottom-1 -right-1 text-[9px]">{v[m.id] === 'up' ? '👍' : '👎'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MatchChips({ tags, p }: { tags: Tag[]; p: P }) {
  const n = p.ov.respondedCount
  const counts: Record<string, number> = Object.fromEntries([...p.ov.interests, ...p.ov.styles].map((x) => [x.key, x.count]))
  const matched = tags.filter((tg) => counts[tg]).sort((a, b) => counts[b] - counts[a]).slice(0, 2)
  if (!matched.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {matched.map((tg) => (
        <span key={tg} className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
          {TAG_META[tg].emoji} {TAG_META[tg].label} · {counts[tg]}/{n}
        </span>
      ))}
    </div>
  )
}

function BookLinks({ links, label = 'Book on' }: { links: BookingLink[]; label?: string }) {
  if (!links.length) return null
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      {links.map((l) => (
        <a
          key={l.url}
          href={l.url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700"
        >
          {l.label} <ExternalLink size={11} />
        </a>
      ))}
    </div>
  )
}

function TransportIcon({ mode }: { mode: TransportMode }) {
  const I = mode === 'flight' ? Plane : mode === 'train' ? Train : mode === 'car' ? Car : Bus
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-sky-600 ring-1 ring-sky-100">
      <I size={18} />
    </div>
  )
}

const BookedBadge = ({ by, p }: { by: ChangeInfo; p: P }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-sea-600 px-2.5 py-1 text-xs font-bold text-white">
    <Check size={12} strokeWidth={3} /> Booked by {p.nameOf(by.memberId)}
  </span>
)

/** "Stay changed — update the itinerary?" / "Updating…" / "Itinerary updated: …" */
function UpdateBanner({ p }: { p: P }) {
  const { adjust } = useTrip()
  const [run, busy] = useAction()
  const toast = useToast()
  const canUpdate = p.t.me.canEditStay || p.t.me.editableOrigins.length > 0
  const organizer = p.t.members.find((m) => m.isOrganizer)!

  if (p.plan.adjustJobId)
    return (
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-100">
        <Loader2 size={18} className="shrink-0 animate-spin" />
        <div>
          <b>Updating the itinerary…</b>
          <div className="text-xs text-sky-700">Re-timing days around the new stay and travel. Votes and swaps are kept.</div>
        </div>
      </div>
    )
  if (p.plan.stale)
    return (
      <div className="mb-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
        <div className="font-bold">Itinerary may be out of date</div>
        <div className="mt-0.5 text-xs text-amber-800">{p.plan.stale.reason}</div>
        {canUpdate ? (
          <Button
            size="sm"
            className="mt-2"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await adjust()
                toast('Updating the itinerary…')
              })
            }
          >
            <RefreshCw size={14} /> Update itinerary
          </Button>
        ) : (
          <div className="mt-1 text-xs text-amber-700">{organizer.name} can update it.</div>
        )}
      </div>
    )
  if (p.doc.updateNote)
    return <div className="mb-4 rounded-2xl bg-sea-50 p-3 text-sm text-sea-900 ring-1 ring-sea-100">✨ <b>Itinerary updated:</b> {p.doc.updateNote}</div>
  return null
}

/* ------------------------------------------------------------------ */
/* Itinerary — one day at a time                                       */
/* ------------------------------------------------------------------ */

function Itinerary({ p, onSwap }: { p: P; onSwap: (i: ResolvedItem) => void }) {
  const { t, plan, days } = p
  const today = new Date().toISOString().slice(0, 10)
  const [di, setDi] = useState(() => Math.max(0, days.findIndex((d) => d.date === today)))
  useEffect(() => {
    window.scrollTo({ top: Math.min(window.scrollY, 260) })
  }, [di])
  const d = days[di] ?? days[0]
  const vegCount = p.ov.food.filter((f) => ['Vegetarian', 'Vegan', 'Jain'].includes(f.key)).reduce((s, f) => s + f.count, 0)
  const dayCost = d.items.reduce((s, a) => s + a.cost + (a.travel?.cost ?? 0), 0)
  const isFirst = di === 0
  const isLast = di === days.length - 1

  // Day 1 starts when the last group arrives; the last day ends for the earliest departure.
  const arrivals = plan.doc.travel.map((g) => effectiveTransport(plan, g.origin)?.arrive).filter((x): x is string => !!x).sort()
  const departures = plan.doc.travel.map((g) => effectiveTransport(plan, g.origin)?.returnDepart).filter((x): x is string => !!x).sort()

  return (
    <div>
      {/* Day selector */}
      <div className="no-scrollbar sticky top-[81px] z-10 -mx-4 flex gap-2 overflow-x-auto bg-slate-50/95 px-4 pb-3 pt-1 backdrop-blur">
        {days.map((day, i) => (
          <button
            key={day.date}
            onClick={() => setDi(i)}
            className={cx(
              'shrink-0 rounded-2xl px-3 py-2 text-center ring-1 transition',
              i === di ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white ring-slate-200',
            )}
          >
            <div className={cx('text-[11px] font-semibold', i === di ? 'text-white/70' : 'text-slate-400')}>Day {i + 1}</div>
            <div className="text-sm font-bold">{fmtDate(day.date).split(' ').slice(0, 2).join(' ')}</div>
          </button>
        ))}
      </div>

      <section key={d.date} className="animate-fade-up">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <div className="text-xs font-semibold text-slate-400">{fmtDate(d.date)}</div>
          <div className="text-xs font-semibold text-slate-400">
            {d.items.length} stops · {inr(dayCost)} pp
          </div>
        </div>
        <h3 className="mb-3 text-xl font-extrabold tracking-tight">{d.title}</h3>

        {isFirst && p.transport && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-100">
            <TransportIcon mode={p.transport.mode} />
            <div>
              <b>Your travel:</b> {p.transport.label}
              {p.transport.duration && ` · ${p.transport.duration}`}
              <div className="text-xs text-sky-700">
                From {p.origin}
                {p.transport.depart && ` · departs ${p.transport.depart}`}
                {p.transport.arrive && ` · arrives ${p.transport.arrive}`}
              </div>
              {arrivals.length > 1 && <div className="text-xs text-sky-700">Everyone’s in by {arrivals[arrivals.length - 1]}</div>}
            </div>
          </div>
        )}
        {isFirst && p.origin === LOCAL_ORIGIN && (
          <div className="mb-3 rounded-2xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-100">📍 You’re already there — meet the group at the stay.</div>
        )}

        <div className="relative space-y-0">
          {d.items.map((a, ai) => {
            const { up, down } = tally(plan.votes[a.id])
            const unhappy = down > up && down >= 2
            const swappedBy = plan.swapsBy[a.slotId]
            return (
              <div key={a.slotId}>
                {a.travel && ai > 0 && (
                  <div className="flex items-center gap-2 py-1.5 pl-[22px] text-xs text-slate-500">
                    <div className="h-6 border-l-2 border-dotted border-slate-300" />
                    <span className="ml-3">
                      {a.travel.mode} · {fmtMins(a.travel.mins)}
                      {a.travel.cost > 0 && ` · ${inr(a.travel.cost)}`}
                    </span>
                  </div>
                )}
                {a.travel && ai === 0 && (
                  <div className="mb-1.5 pl-1 text-xs text-slate-500">
                    🚕 {a.travel.mode} · {fmtMins(a.travel.mins)}
                    {a.travel.cost > 0 && ` · ${inr(a.travel.cost)}`}
                  </div>
                )}
                <div className={cx('rounded-3xl bg-white p-4 shadow-soft ring-1', unhappy ? 'ring-amber-300' : 'ring-slate-900/5', a.swapped && 'ring-2 ring-sea-400')}>
                  <div className="flex gap-3">
                    <div className="w-11 shrink-0 text-center">
                      <div className="text-[11px] font-bold text-slate-400">{a.time}</div>
                      <div className="mt-1 text-2xl">{a.emoji}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <WhyToggle why={a.why}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold leading-snug">{a.title}</div>
                          {a.cost > 0 && <div className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{inr(a.cost)}</div>}
                        </div>
                        <a href={mapsLink(a.place, p.doc.destination.name)} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline-offset-2 hover:underline">
                          📍 {a.place}
                        </a>
                      </WhyToggle>
                      <MatchChips tags={a.tags} p={p} />
                      {a.updated && <div className="mt-2 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">↻ Updated</div>}
                      {a.swapped && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-sea-700">
                          ↔ Swapped in by {swappedBy ? p.nameOf(swappedBy.memberId) : 'the group'}
                          {swappedBy && <span className="font-normal text-slate-400">· {ago(swappedBy.at)}</span>}
                        </div>
                      )}
                      {unhappy && <div className="mt-2 text-xs font-semibold text-amber-700">🤔 Group isn’t keen — try a swap?</div>}
                      {a.tags.length > 0 && (
                        <div className="mt-3 flex items-center justify-between">
                          <VoteBar id={a.id} />
                          {a.alts.length > 0 && !t.locked ? (
                            <button
                              onClick={() => onSwap(a)}
                              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold text-brand-600 ring-1 ring-brand-200 hover:bg-brand-50 active:scale-95"
                            >
                              <ArrowLeftRight size={13} /> Swap
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {isFirst && vegCount > 0 && (
          <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-800 ring-1 ring-emerald-100">
            🥗 Meal stops are chosen with good vegetarian options for the {vegCount} veggie{vegCount > 1 ? 's' : ''} in the group.
          </div>
        )}
        {isLast && p.transport && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-100">
            <TransportIcon mode={p.transport.mode} />
            <div>
              <b>Heading home:</b> {p.transport.label}
              {p.transport.returnDepart && <div className="text-xs text-sky-700">Leaves {p.transport.returnDepart}</div>}
              {departures.length > 1 && <div className="text-xs text-sky-700">First departure of the group: {departures[0]}</div>}
            </div>
          </div>
        )}
        {isLast && p.doc.tips.length > 0 && (
          <Card className="mt-3">
            <div className="text-sm font-bold">💡 Tips for your group</div>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              {p.doc.tips.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="text-brand-500">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Prev / next day */}
        <div className="mt-4 flex items-center justify-between">
          <Button size="sm" variant="ghost" disabled={isFirst} onClick={() => setDi(di - 1)}>
            <ChevronLeft size={16} /> Day {di}
          </Button>
          <div className="text-xs font-semibold text-slate-400">
            Day {di + 1} of {days.length}
          </div>
          <Button size="sm" variant="ghost" disabled={isLast} onClick={() => setDi(di + 1)}>
            Day {di + 2} <ChevronRight size={16} />
          </Button>
        </div>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Stay                                                                */
/* ------------------------------------------------------------------ */

/** Where this stay's price came from, so nobody mistakes an estimate for a quote. */
function PriceProvenance({ stay }: { stay: Stay }) {
  const badge =
    stay.priceSource === 'booked'
      ? { text: '✓ Price you paid', cls: 'bg-sea-50 text-sea-700 ring-sea-100' }
      : stay.priceSource === 'web'
        ? { text: '✓ Price checked on the web', cls: 'bg-sea-50 text-sea-700 ring-sea-100' }
        : stay.priceSource === 'estimate'
          ? { text: '≈ AI estimate', cls: 'bg-amber-50 text-amber-700 ring-amber-100' }
          : { text: 'Sample price (offline mode)', cls: 'bg-slate-100 text-slate-500 ring-slate-200' }
  return (
    <div className="mt-3 rounded-2xl bg-slate-50 p-2.5 text-xs text-slate-600">
      <span className={cx('inline-block rounded-full px-2 py-0.5 font-bold ring-1', badge.cls)}>{badge.text}</span>
      {stay.priceNote && <p className="mt-1.5 leading-snug">{stay.priceNote}</p>}
      {stay.sources.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-x-2 text-slate-400">
          Sources:
          {stay.sources.map((src) => (
            <a key={src.url} href={src.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-slate-600">
              {src.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function StayCard({ p, s, on, actions }: { p: P; s: Stay; on: boolean; actions?: ReactNode }) {
  const nights = p.costs.nights
  const diff = (s.pricePerNight - p.stay.pricePerNight) * nights
  return (
    <div className={cx('overflow-hidden rounded-3xl bg-white shadow-soft ring-1', on ? 'ring-2 ring-brand-500' : 'ring-slate-900/5')}>
      <div className={`flex h-20 items-end justify-between bg-gradient-to-br p-3 ${s.priceSource === 'booked' ? 'from-sea-500 to-sea-700' : s.tier === 'budget' ? 'from-slate-300 to-slate-400' : s.tier === 'mid' ? 'from-sea-400 to-sea-600' : 'from-amber-300 to-amber-500'}`}>
        <div className="text-4xl drop-shadow">{s.emoji}</div>
        <div className="flex items-center gap-1.5">
          {s.priceSource !== 'booked' && <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">{s.tier}</span>}
          {p.plan.bookings.stay && on ? <BookedBadge by={p.plan.bookings.stay.bookedBy} p={p} /> : on && <div className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-brand-600">✓ In the plan</div>}
        </div>
      </div>
      <div className="p-4">
        <WhyToggle why={s.why}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold leading-snug">{s.name}</div>
              <div className="text-xs text-slate-500">
                {s.kind}
                {s.area && ` · ${s.area}`}
              </div>
            </div>
            {s.rating != null && (
              <div className="flex shrink-0 items-center gap-0.5 text-sm font-bold">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                {s.rating}
              </div>
            )}
          </div>
        </WhyToggle>
        {s.perks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {s.perks.map((perk) => (
              <span key={perk} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {perk}
              </span>
            ))}
          </div>
        )}
        {on && !p.plan.bookings.stay && <ByLine p={p} info={p.plan.changes.stay} verb="Chosen" />}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-lg font-extrabold">
              {inr(s.pricePerNight)}
              <span className="text-xs font-medium text-slate-500"> /person/night</span>
            </div>
            <div className="text-xs text-slate-500">
              {inr(s.roomRate)} {s.wholeProperty ? 'for the whole place' : `per room × ${s.rooms} rooms`} · incl. taxes
            </div>
            {!on && (
              <div className={cx('text-xs font-semibold', diff > 0 ? 'text-amber-600' : 'text-sea-700')}>
                {diff > 0 ? '+' : '−'}
                {inr(Math.abs(diff))} per person
              </div>
            )}
          </div>
          {actions}
        </div>
        <PriceProvenance stay={s} />
        <BookLinks links={s.links} />
      </div>
    </div>
  )
}

function StayTab({ p }: { p: P }) {
  const { select } = useTrip()
  const [run] = useAction()
  const toast = useToast()
  const [booking, setBooking] = useState<'suggested' | 'other' | null>(null)
  const booked = p.plan.bookings.stay
  const canEdit = p.t.me.canEditStay
  const bookedCustom = booked && !booked.optionId ? booked.stay : null

  return (
    <div className="space-y-3">
      <div className="px-1 text-sm text-slate-500">
        {p.costs.nights} nights · {fmtRange(p.doc.dates[0], p.doc.dates[p.doc.dates.length - 1])} · {p.t.groupSize} guests
        {!canEdit && ' · the organizer chooses and books the stay'}
      </div>

      {bookedCustom && (
        <StayCard
          p={p}
          s={bookedCustom}
          on
          actions={canEdit && <Button size="sm" variant="secondary" onClick={() => setBooking('other')}>Edit</Button>}
        />
      )}

      {p.doc.stays.map((s) => {
        const on = !bookedCustom && s.id === (booked?.optionId ?? p.plan.stayId)
        return (
          <StayCard
            key={s.id}
            p={p}
            s={on && booked?.stay ? booked.stay : s}
            on={on}
            actions={
              on ? (
                <div className="flex flex-col items-end gap-1.5">
                  <VoteBar id={s.id} compact />
                  {canEdit && !booked && (
                    <Button size="sm" variant="sea" onClick={() => setBooking('suggested')}>
                      <Check size={14} /> I’ve booked this
                    </Button>
                  )}
                </div>
              ) : (
                canEdit &&
                !booked &&
                !p.t.locked && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      run(async () => {
                        await select({ stayId: s.id })
                        toast('Stay updated for the group')
                      })
                    }
                  >
                    Choose this
                  </Button>
                )
              )
            }
          />
        )
      })}

      {canEdit && (
        <button onClick={() => setBooking(booked ? (booked.optionId ? 'suggested' : 'other') : 'other')} className="w-full rounded-2xl py-3 text-sm font-semibold text-brand-600 hover:bg-brand-50">
          {booked ? 'Edit or remove the stay booking' : 'Booked somewhere else? Add it'}
        </button>
      )}
      <p className="px-1 text-xs text-slate-400">
        {p.doc.pricesCheckedAt
          ? `Hotel prices were checked on the web on ${new Date(p.doc.pricesCheckedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Rates change — confirm the final price on the booking site.`
          : 'Prices are estimates — confirm the live price on the booking site.'}
      </p>

      <StayBookingSheet open={!!booking} mode={booking ?? 'other'} p={p} onClose={() => setBooking(null)} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Travel — one section per starting city, yours first                 */
/* ------------------------------------------------------------------ */

function TravelGroupCard({ p, origin, mine }: { p: P; origin: string; mine: boolean }) {
  const { select } = useTrip()
  const [run] = useAction()
  const toast = useToast()
  const [open, setOpen] = useState(mine)
  const [booking, setBooking] = useState<'suggested' | 'other' | null>(null)
  const group = p.doc.travel.find((g) => g.origin === origin)!
  const travellers = p.t.members.filter((m) => m.origin === origin)
  const booked = p.plan.bookings.travel[origin]
  const chosen = effectiveTransport(p.plan, origin)
  const canEdit = p.t.me.editableOrigins.includes(origin)
  const options: TransportOption[] = booked && !booked.optionId && booked.transport ? [booked.transport, ...group.options] : group.options

  return (
    <div className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-900/5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 text-left">
        <div className="min-w-0 flex-1">
          <div className="font-bold">
            From {origin} {mine && <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">You</span>}
          </div>
          <div className="truncate text-xs text-slate-500">
            {travellers.map((m) => m.name).join(', ') || 'Nobody yet'} · {chosen ? `${chosen.label} · ${inr(chosen.price * 2)} return` : 'not chosen'}
          </div>
        </div>
        {booked ? <BookedBadge by={booked.bookedBy} p={p} /> : null}
        <ChevronDown size={18} className={cx('shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-3 space-y-2.5">
          {!canEdit && <div className="text-xs text-slate-400">{travellers.length > 1 ? 'Several people travel from here, so the organizer decides.' : 'Chosen by the person travelling from here.'}</div>}
          {!booked && <ByLine p={p} info={p.plan.changes.travel[origin]} verb="Chosen" />}
          {options.map((o) => {
            const on = chosen?.id === o.id
            const selectable = canEdit && !booked && !on && !p.t.locked
            return (
              <div
                key={o.id}
                role={selectable ? 'button' : undefined}
                tabIndex={selectable ? 0 : undefined}
                onClick={() =>
                  selectable &&
                  run(async () => {
                    await select({ transportId: o.id, origin })
                    toast(`Travel from ${origin} updated`)
                  })
                }
                className={cx('rounded-2xl p-3 ring-1 transition', on ? 'bg-brand-50/50 ring-2 ring-brand-500' : 'ring-slate-200', selectable && 'cursor-pointer hover:bg-slate-50')}
              >
                <div className="flex items-center gap-3">
                  <TransportIcon mode={o.mode} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold leading-snug">{o.label}</div>
                    <div className="text-xs text-slate-500">
                      {[o.duration, o.depart && `departs ${o.depart}`, o.arrive && `arrives ${o.arrive}`, o.returnDepart && `return leaves ${o.returnDepart}`].filter(Boolean).join(' · ')}
                    </div>
                    {o.note && <div className="mt-0.5 text-xs text-slate-500">{o.note}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold">{inr(o.price * 2)}</div>
                    <div className="text-[10px] text-slate-400">return pp</div>
                    <div className={cx('ml-auto mt-1 grid h-5 w-5 place-items-center rounded-full', on ? 'bg-brand-500 text-white' : 'ring-2 ring-slate-200')}>
                      {on && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                </div>
                <BookLinks links={o.links} label="Book" />
              </div>
            )
          })}
          {canEdit && (
            <div className="flex flex-wrap gap-2 pt-1">
              {!booked && chosen && (
                <Button size="sm" variant="sea" onClick={() => setBooking('suggested')}>
                  <Check size={14} /> I’ve booked {travellers.length > 1 ? 'this for the group' : 'this'}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setBooking(booked ? (booked.optionId ? 'suggested' : 'other') : 'other')}>
                {booked ? 'Edit or remove booking' : 'Booked something else?'}
              </Button>
            </div>
          )}
        </div>
      )}
      <TravelBookingSheet open={!!booking} mode={booking ?? 'other'} p={p} origin={origin} onClose={() => setBooking(null)} />
    </div>
  )
}

function TravelTab({ p }: { p: P }) {
  const localLegs = p.days.flatMap((d) => d.items).filter((a) => a.travel)
  const groups = [...p.doc.travel].sort((a, b) => (a.origin === p.origin ? -1 : b.origin === p.origin ? 1 : 0))
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 px-1 text-sm font-bold">Getting there & back</div>
        {p.origin === LOCAL_ORIGIN && <div className="mb-2 rounded-2xl bg-sky-50 p-3 text-sm text-sky-900">📍 You’re already there — no travel to book.</div>}
        <div className="space-y-2.5">
          {groups.map((g) => (
            <TravelGroupCard key={g.origin} p={p} origin={g.origin} mine={g.origin === p.origin} />
          ))}
        </div>
      </div>
      <Card>
        <div className="text-sm font-bold">Getting around</div>
        <div className="mt-1 text-sm text-slate-500">
          {localLegs.length} local trips · {inr(p.costs.local)} per person total
        </div>
        <div className="mt-3 space-y-1.5">
          {Object.entries(
            localLegs.reduce<Record<string, { n: number; cost: number }>>((acc, a) => {
              const k = a.travel!.mode
              acc[k] = { n: (acc[k]?.n ?? 0) + 1, cost: (acc[k]?.cost ?? 0) + a.travel!.cost }
              return acc
            }, {}),
          ).map(([mode, v]) => (
            <div key={mode} className="flex justify-between text-sm">
              <span>
                {mode} <span className="text-slate-400">× {v.n}</span>
              </span>
              <span className="font-semibold">{inr(v.cost)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Cost — personal                                                     */
/* ------------------------------------------------------------------ */

function CostTab({ p }: { p: P }) {
  const { costs, t } = p
  const fit = t.budgetFit
  const myBudget = t.me.prefs?.budget ?? null
  const rows = [
    { key: 'travel', label: p.transport ? `Your travel (return, from ${p.origin})` : 'Travel (already there)', color: 'bg-sky-500', value: costs.travel },
    { key: 'stay', label: `Stay (${costs.nights} nights, your share)`, color: 'bg-sea-500', value: costs.stay },
    { key: 'food', label: `Food (${p.days.length} days)`, color: 'bg-amber-400', value: costs.food },
    { key: 'activities', label: 'Activities & entry', color: 'bg-brand-500', value: costs.activities },
    { key: 'local', label: 'Local transport', color: 'bg-violet-500', value: costs.local },
  ]
  const scaleMax = Math.max(myBudget ?? 0, costs.total) * 1.08
  const pct = (v: number) => `${(v / scaleMax) * 100}%`
  const allFit = fit && fit.fits === fit.of

  return (
    <div className="space-y-3">
      <Card>
        <WhyToggle
          why={`Planned so each person's total stays within their own budget: ${p.stay.priceSource === 'booked' ? 'the stay is what you booked' : p.stay.tier === 'budget' ? 'a budget-friendly stay' : p.stay.tier === 'mid' ? 'a shared mid-range stay' : 'a premium stay since budgets allowed it'}, and for each city the fastest travel that still fits.`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your cost, all-in</div>
          <div className="text-4xl font-extrabold tabular-nums tracking-tight">{inr(costs.total)}</div>
        </WhyToggle>
        {fit && (
          <div className={cx('mt-1 text-sm font-semibold', allFit ? 'text-sea-700' : 'text-amber-600')}>
            {allFit ? `✓ Fits everyone’s budget (${fit.of} of ${fit.of})` : `Fits ${fit.fits} of ${fit.of} people’s budgets`}
          </div>
        )}

        <div className="relative mt-8">
          <div className="flex h-5 overflow-hidden rounded-full bg-slate-100">
            {rows.map((r) => (
              <div key={r.key} className={r.color} style={{ width: pct(r.value) }} />
            ))}
          </div>
          {myBudget != null && (
            <div className="absolute -top-6 flex -translate-x-1/2 flex-col items-center" style={{ left: pct(myBudget) }}>
              <div className="whitespace-nowrap text-[10px] font-bold text-slate-600">Your budget {inr(myBudget)}</div>
              <div className="h-9 w-0.5 bg-slate-900" />
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-between text-[11px] text-slate-400">
          <span>₹0</span>
          {p.range.max > p.range.min && (
            <span>
              Group: {inr(p.range.min)} – {inr(p.range.max)} by city
            </span>
          )}
        </div>
      </Card>

      <Card className="!p-0">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
            <div className={`h-3 w-3 rounded-full ${r.color}`} />
            <div className="flex-1 text-sm font-medium">{r.label}</div>
            <div className="text-sm font-bold tabular-nums">{inr(r.value)}</div>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-b-3xl bg-slate-50 px-4 py-3">
          <div className="font-bold">Your total</div>
          <div className="font-extrabold tabular-nums">{inr(costs.total)}</div>
        </div>
      </Card>
      <p className="px-1 text-xs text-slate-400">Only you see your budget. Others see their own cost from their city.</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Swap sheet                                                          */
/* ------------------------------------------------------------------ */

function SwapSheet({ p, item, onClose }: { p: P; item: ResolvedItem | null; onClose: () => void }) {
  const { swap } = useTrip()
  const [run] = useAction()
  const toast = useToast()
  if (!item) return null
  const original = p.doc.days.flatMap((d) => d.items).find((a) => a.id === item.slotId)!
  const options = [original, ...original.alts]

  return (
    <BottomSheet open onClose={onClose} title={`Swap “${original.title}”`}>
      <div className="mb-3 text-sm text-slate-500">{item.time} · pick what the group would enjoy more</div>
      <div className="space-y-2.5">
        {options.map((o) => {
          const on = o.id === item.id
          return (
            <div key={o.id} className={cx('rounded-3xl p-4 ring-1 transition', on ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200')}>
              <WhyToggle why={o.why}>
                <button
                  onClick={() =>
                    run(async () => {
                      if (!on) await swap(item.slotId, o.id === original.id ? null : o.id)
                      toast(on ? 'No change' : `Swapped to ${o.title}`)
                      onClose()
                    })
                  }
                  className="flex w-full items-start gap-3 text-left active:scale-[.99]"
                >
                  <div className="text-3xl">{o.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold">{o.title}</div>
                      <div className="shrink-0 text-sm font-bold">{o.cost ? inr(o.cost) : 'Free'}</div>
                    </div>
                    <div className="text-xs text-slate-500">📍 {o.place}</div>
                    {o.id === original.id && <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Original pick</div>}
                  </div>
                </button>
              </WhyToggle>
            </div>
          )
        })}
      </div>
    </BottomSheet>
  )
}

export type PlanCtx = P
