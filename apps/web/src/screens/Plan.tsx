import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Bus, Car, Check, ChevronLeft, ExternalLink, Lock, Plane, Star, ThumbsDown, ThumbsUp, Train } from 'lucide-react'
import {
  agreement,
  applySwaps,
  costBreakdown,
  fmtDate,
  fmtMins,
  fmtRange,
  inr,
  mapsLink,
  TAG_META,
  tally,
  votableIds,
  type BookingLink,
  type ResolvedItem,
  type Stay,
  type Tag,
  type TransportMode,
  type TripView,
} from '@tripzy/shared'
import { gradient } from '../lib/gradients'
import { useTrip } from '../state/TripContext'
import { useAction, useToast } from '../components/Toast'
import { Avatar, BottomBar, BottomSheet, Button, Card, cx } from '../components/ui'

type TabId = 'itinerary' | 'stay' | 'travel' | 'cost'
const TABS: { id: TabId; label: string }[] = [
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'stay', label: 'Stay' },
  { id: 'travel', label: 'Travel' },
  { id: 'cost', label: 'Cost' },
]

/** Everything the plan tabs need, derived once from the trip. */
function usePlan(t: TripView) {
  const plan = t.plan!
  const doc = plan.doc
  const days = applySwaps(doc.days, plan.swaps)
  const stay = doc.stays.find((s) => s.id === plan.stayId) ?? doc.stays[0]
  const transport = doc.transports.find((x) => x.id === plan.transportId) ?? doc.transports[0]
  const costs = costBreakdown(doc, days, stay, transport)
  return { plan, doc, days, stay, transport, costs, ov: t.overlap }
}
type P = ReturnType<typeof usePlan>

export default function Plan() {
  const nav = useNavigate()
  const toast = useToast()
  const [run, busy] = useAction()
  const { trip, me, lock, switchMember } = useTrip()
  const t = trip!
  const p = usePlan(t)
  const { doc, days, costs, ov } = p
  const [tab, setTab] = useState<TabId>('itinerary')
  const [swapItem, setSwapItem] = useState<ResolvedItem | null>(null)

  const votable = votableIds(days, p.stay.id)
  const agree = agreement(p.plan.votes, votable)
  const myVotes = votable.filter((id) => me && p.plan.votes[id]?.[me.id]).length
  const budget = ov.budget.min || 20000
  const under = budget - costs.total
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
            <div className="text-xs text-white/80">Per person, all-in</div>
            <div className="text-2xl font-extrabold tabular-nums">{inr(costs.total)}</div>
            <div className="mt-0.5 text-xs font-semibold">
              {under >= 0 ? `✓ ${inr(under)} under tightest budget` : `⚠ ${inr(-under)} over tightest budget`}
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
        {me && !t.locked && (
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
          {tab === 'cost' && <CostTab p={p} fit={t.budgetFit} />}
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

function Itinerary({ p, onSwap }: { p: P; onSwap: (i: ResolvedItem) => void }) {
  const { trip } = useTrip()
  const t = trip!
  const vegCount = p.ov.food.filter((f) => ['Vegetarian', 'Vegan', 'Jain'].includes(f.key)).reduce((s, f) => s + f.count, 0)

  return (
    <div className="space-y-6">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {p.days.map((d, i) => (
          <a key={i} href={`#day-${i + 1}`} className="shrink-0 rounded-2xl bg-white px-3 py-2 text-center ring-1 ring-slate-200">
            <div className="text-[11px] font-semibold text-slate-400">Day {i + 1}</div>
            <div className="text-sm font-bold">{fmtDate(d.date).split(' ').slice(0, 2).join(' ')}</div>
          </a>
        ))}
      </div>

      {p.days.map((d, di) => (
        <section key={di} id={`day-${di + 1}`} className="scroll-mt-24">
          <div className="mb-3 flex items-baseline gap-2">
            <div className="rounded-lg bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">Day {di + 1}</div>
            <div className="text-xs font-semibold text-slate-400">{fmtDate(d.date)}</div>
          </div>
          <h3 className="mb-3 text-xl font-extrabold tracking-tight">{d.title}</h3>

          {di === 0 && (
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-100">
              <TransportIcon mode={p.transport.mode} />
              <div>
                <b>Getting there:</b> {p.transport.label} · {p.transport.duration}
                <div className="text-xs text-sky-700">From {t.origin} · departs {p.transport.depart}</div>
              </div>
            </div>
          )}

          <div className="relative space-y-0">
            {d.items.map((a, ai) => {
              const { up, down } = tally(p.plan.votes[a.id])
              const unhappy = down > up && down >= 2
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
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold leading-snug">{a.title}</div>
                          {a.cost > 0 && <div className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{inr(a.cost)}</div>}
                        </div>
                        <a href={mapsLink(a.place, p.doc.destination.name)} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline-offset-2 hover:underline">
                          📍 {a.place}
                        </a>
                        <p className="mt-1.5 text-sm text-slate-600">
                          <span className="font-semibold text-slate-800">Why: </span>
                          {a.why}
                        </p>
                        <MatchChips tags={a.tags} p={p} />
                        {a.swapped && <div className="mt-2 text-xs font-semibold text-sea-700">↔ Swapped in by the group</div>}
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
          {di === 0 && vegCount > 0 && (
            <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-800 ring-1 ring-emerald-100">
              🥗 Meal stops are chosen with good vegetarian options for the {vegCount} veggie{vegCount > 1 ? 's' : ''} in the group.
            </div>
          )}
        </section>
      ))}

      {p.doc.tips.length > 0 && (
        <Card>
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

function StayTab({ p }: { p: P }) {
  const { select, trip } = useTrip()
  const [run] = useAction()
  const toast = useToast()
  const nights = p.costs.nights
  return (
    <div className="space-y-3">
      <div className="px-1 text-sm text-slate-500">
        {nights} nights · {fmtRange(p.doc.dates[0], p.doc.dates[p.doc.dates.length - 1])} · {trip!.groupSize} guests
      </div>
      {p.doc.stays.map((s) => {
        const on = s.id === p.stay.id
        const diff = (s.pricePerNight - p.stay.pricePerNight) * nights
        return (
          <div key={s.id} className={cx('overflow-hidden rounded-3xl bg-white shadow-soft ring-1', on ? 'ring-2 ring-brand-500' : 'ring-slate-900/5')}>
            <div className={`flex h-24 items-end justify-between bg-gradient-to-br p-3 ${s.tier === 'budget' ? 'from-slate-300 to-slate-400' : s.tier === 'mid' ? 'from-sea-400 to-sea-600' : 'from-amber-300 to-amber-500'}`}>
              <div className="text-5xl drop-shadow">{s.emoji}</div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">{s.tier}</span>
                {on && <div className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-brand-600">✓ In the plan</div>}
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold leading-snug">{s.name}</div>
                  <div className="text-xs text-slate-500">
                    {s.kind} · {s.area}
                  </div>
                </div>
                {s.rating != null && (
                  <div className="flex shrink-0 items-center gap-0.5 text-sm font-bold">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    {s.rating}
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {s.perks.map((perk) => (
                  <span key={perk} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {perk}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Why: </span>
                {s.why}
              </p>
              <div className="mt-3 flex items-center justify-between">
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
                {on ? (
                  <VoteBar id={s.id} compact />
                ) : (
                  !trip!.locked && (
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
                )}
              </div>
              <PriceProvenance stay={s} />
              <BookLinks links={s.links} />
            </div>
          </div>
        )
      })}
      <p className="px-1 text-xs text-slate-400">
        {p.doc.pricesCheckedAt
          ? `Hotel prices were checked on the web on ${new Date(p.doc.pricesCheckedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Rates change — confirm the final price on the booking site.`
          : 'Prices are estimates — confirm the live price on the booking site.'}
      </p>
    </div>
  )
}

/** Where this stay's price came from, so nobody mistakes an estimate for a quote. */
function PriceProvenance({ stay }: { stay: Stay }) {
  const badge =
    stay.priceSource === 'web'
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

function TravelTab({ p }: { p: P }) {
  const { select, trip } = useTrip()
  const [run] = useAction()
  const toast = useToast()
  const localLegs = p.days.flatMap((d) => d.items).filter((a) => a.travel)
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 px-1 text-sm font-bold">Getting there & back · from {trip!.origin}</div>
        <div className="space-y-2.5">
          {p.doc.transports.map((o) => {
            const on = o.id === p.transport.id
            return (
              <div
                key={o.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  !trip!.locked &&
                  !on &&
                  run(async () => {
                    await select({ transportId: o.id })
                    toast('Travel updated')
                  })
                }
                className={cx('w-full cursor-pointer rounded-3xl bg-white p-4 text-left shadow-soft ring-1 transition', on ? 'ring-2 ring-brand-500' : 'ring-slate-900/5')}
              >
                <div className="flex items-center gap-3">
                  <TransportIcon mode={o.mode} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold leading-snug">{o.label}</div>
                    <div className="text-xs text-slate-500">
                      {o.duration} · departs {o.depart}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">{o.note}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold">{inr(o.price * 2)}</div>
                    <div className="text-[10px] text-slate-400">return</div>
                    <div className={cx('ml-auto mt-1 grid h-5 w-5 place-items-center rounded-full', on ? 'bg-brand-500 text-white' : 'ring-2 ring-slate-200')}>
                      {on && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                </div>
                <BookLinks links={o.links} label="Book" />
              </div>
            )
          })}
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

function CostTab({ p, fit }: { p: P; fit: TripView['budgetFit'] }) {
  const { costs, ov } = p
  const rows = [
    { key: 'travel', label: 'Travel (return)', color: 'bg-sky-500', value: costs.travel },
    { key: 'stay', label: `Stay (${costs.nights} nights)`, color: 'bg-sea-500', value: costs.stay },
    { key: 'food', label: `Food (${p.days.length} days)`, color: 'bg-amber-400', value: costs.food },
    { key: 'activities', label: 'Activities & entry', color: 'bg-brand-500', value: costs.activities },
    { key: 'local', label: 'Local transport', color: 'bg-violet-500', value: costs.local },
  ]
  const scaleMax = Math.max(ov.budget.max, costs.total) * 1.08
  const pct = (v: number) => `${(v / scaleMax) * 100}%`
  const allFit = fit && fit.fits === fit.of

  return (
    <div className="space-y-3">
      <Card>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Per person, all-in</div>
        <div className="text-4xl font-extrabold tabular-nums tracking-tight">{inr(costs.total)}</div>
        {fit && (
          <div className={cx('mt-1 text-sm font-semibold', allFit ? 'text-sea-700' : 'text-amber-600')}>
            {allFit ? `✓ Fits all ${fit.of} budgets` : `Fits ${fit.fits} of ${fit.of} budgets`}
          </div>
        )}

        <div className="relative mt-8">
          <div className="flex h-5 overflow-hidden rounded-full bg-slate-100">
            {rows.map((r) => (
              <div key={r.key} className={r.color} style={{ width: pct(r.value) }} />
            ))}
          </div>
          <div className="absolute -top-6 flex -translate-x-1/2 flex-col items-center" style={{ left: pct(ov.budget.min) }}>
            <div className="whitespace-nowrap text-[10px] font-bold text-slate-600">Tightest {inr(ov.budget.min)}</div>
            <div className="h-9 w-0.5 bg-slate-900" />
          </div>
          {ov.budget.max !== ov.budget.min && (
            <div className="absolute -bottom-6 flex -translate-x-1/2 flex-col items-center" style={{ left: pct(ov.budget.max) }}>
              <div className="h-9 w-0.5 bg-slate-300" />
              <div className="whitespace-nowrap text-[10px] font-bold text-slate-400">Highest</div>
            </div>
          )}
        </div>
        <div className="mt-8 flex justify-between text-[11px] text-slate-400">
          <span>₹0</span>
          <span>
            Group budgets: {inr(ov.budget.min)} – {inr(ov.budget.max)}
          </span>
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
          <div className="font-bold">Total per person</div>
          <div className="font-extrabold tabular-nums">{inr(costs.total)}</div>
        </div>
      </Card>

      <div className="rounded-2xl bg-sea-50 p-3 text-sm text-sea-900 ring-1 ring-sea-100">
        💡 <b>Why this price:</b> planned to the tightest budget in the group ({inr(ov.budget.min)}) with{' '}
        {p.stay.tier === 'budget' ? 'a budget-friendly stay' : p.stay.tier === 'mid' ? 'a shared mid-range stay' : 'a premium stay since budgets allowed it'} and{' '}
        {p.transport.mode === 'flight' ? 'the fastest flight that still fits' : `the ${p.transport.mode} to keep travel affordable`}. Group total ≈{' '}
        {inr(costs.total * p.ov.respondedCount)}.
      </div>
    </div>
  )
}

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
            <button
              key={o.id}
              onClick={() =>
                run(async () => {
                  if (!on) await swap(item.slotId, o.id === original.id ? null : o.id)
                  toast(on ? 'No change' : `Swapped to ${o.title}`)
                  onClose()
                })
              }
              className={cx('flex w-full items-start gap-3 rounded-3xl p-4 text-left ring-1 transition active:scale-[.99]', on ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}
            >
              <div className="text-3xl">{o.emoji}</div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold">{o.title}</div>
                  <div className="shrink-0 text-sm font-bold">{o.cost ? inr(o.cost) : 'Free'}</div>
                </div>
                <div className="text-xs text-slate-500">📍 {o.place}</div>
                <div className="mt-1 text-sm text-slate-600">{o.why}</div>
                {o.id === original.id && <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Original pick</div>}
              </div>
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
