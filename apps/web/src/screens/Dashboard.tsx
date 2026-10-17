import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Bell, Share2, Sparkles, UserPlus } from 'lucide-react'
import { dayName, dayNum, fmtDate, fmtRange, inr, INTERESTS, LOCAL_ORIGIN, personalCost, POPULAR_DESTINATIONS, STYLES } from '@tripzy/shared'
import { inviteUrl, whatsappUrl } from '../lib/share'
import { ago } from '../lib/time'
import { useTrip } from '../state/TripContext'
import { useAction, useToast } from '../components/Toast'
import { Avatar, BottomBar, Button, Card, PageHeader, cx } from '../components/ui'

function Ring({ value, total }: { value: number; total: number }) {
  const r = 30
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle
          cx="36" cy="36" r={r} fill="none" stroke="#f95d36" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value / total))} className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <div>
          <div className="text-xl font-extrabold">{value}/{total}</div>
          <div className="text-[10px] font-semibold text-slate-400">in</div>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="mb-2 mt-6 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">{children}</div>
}

export default function Dashboard() {
  const nav = useNavigate()
  const toast = useToast()
  const [run] = useAction()
  const { trip, me, switchMember } = useTrip()
  const t = trip!
  const ov = t.overlap
  const n = ov.respondedCount
  const popular = POPULAR_DESTINATIONS.find((d) => d.name === t.destinationQuery)
  const organizer = t.members.find((m) => m.isOrganizer)!
  const isOrganizer = t.me.isOrganizer
  const waitingOn = Math.max(0, t.groupSize - n)
  const notJoined = Math.max(0, t.groupSize - t.members.length)
  const link = inviteUrl(t.inviteCode)

  const BMIN = 5000
  const BMAX = Math.max(60000, ov.budget.max)
  const pct = (v: number) => `${((v - BMIN) / (BMAX - BMIN)) * 100}%`

  return (
    <div className="animate-fade-up pb-2">
      <PageHeader
        title={t.name}
        sub={`${t.destinationQuery ? (popular?.emoji ?? '📍') + ' ' + t.destinationQuery : '✨ AI picks the destination'} · ${t.days} days · ${t.groupSize} people`}
        right={
          <button onClick={() => nav('/invite')} className="grid h-10 w-10 place-items-center rounded-full bg-white ring-1 ring-slate-200" aria-label="Share invite">
            <Share2 size={18} />
          </button>
        }
      />

      {t.plan && (
        <button onClick={() => nav(t.locked ? '/locked' : '/plan')} className="mb-3 flex w-full items-center gap-3 rounded-3xl bg-slate-900 p-4 text-left text-white">
          <div className="text-2xl">{t.locked ? '🔒' : '🗺️'}</div>
          <div className="flex-1">
            <div className="font-bold">{t.locked ? 'Trip locked!' : 'Your plan is ready'}</div>
            <div className="text-sm text-slate-400">
              Your cost {inr(personalCost(t.plan, t.me.origin).total)}
              {t.me.origin !== LOCAL_ORIGIN ? ` incl. travel from ${t.me.origin}` : ''} · {t.locked ? 'see the final plan & bookings' : 'vote and swap before it’s locked'}
            </div>
          </div>
          <ArrowRight size={18} />
        </button>
      )}

      {!t.me.prefs && !t.locked && (
        <button onClick={() => nav('/join')} className="mb-3 flex w-full items-center gap-3 rounded-3xl bg-brand-50 p-4 text-left ring-1 ring-brand-200">
          <div className="text-2xl">✍️</div>
          <div className="flex-1">
            <div className="font-bold text-brand-800">Add your preferences</div>
            <div className="text-sm text-brand-700/80">Takes about 90 seconds</div>
          </div>
          <ArrowRight size={18} className="text-brand-600" />
        </button>
      )}

      {/* Responses */}
      <Card>
        <div className="flex items-center gap-4">
          <Ring value={n} total={t.groupSize} />
          <div className="flex-1">
            <div className="text-lg font-extrabold leading-tight">
              {waitingOn === 0 ? 'Everyone’s in! 🎉' : `Waiting on ${waitingOn} ${waitingOn === 1 ? 'friend' : 'friends'}`}
            </div>
            <div className="mt-0.5 text-sm text-slate-500">
              {waitingOn === 0 ? 'Ready to generate the plan.' : 'You can generate now — late answers can be added with a regenerate.'}
            </div>
          </div>
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {t.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-2.5">
              <Avatar member={m} size={36} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {m.name}
                  {m.id === me?.id && <span className="text-slate-400"> (you)</span>}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {m.responded
                    ? `${m.origin === LOCAL_ORIGIN ? '📍 there' : `from ${m.origin}`} · ${STYLES.find((s) => s.id === m.style)?.emoji ?? ''} ${STYLES.find((s) => s.id === m.style)?.label ?? ''} · ${m.interests
                        .map((i) => INTERESTS.find((x) => x.id === i)?.emoji)
                        .join('')} · ${ago(m.respondedAt)}`
                    : m.isOrganizer
                      ? 'Organizer · hasn’t added preferences'
                      : 'Joined · not answered yet'}
                </div>
              </div>
              {m.responded ? (
                <span className="rounded-full bg-sea-50 px-2.5 py-1 text-xs font-bold text-sea-700">✓ In</span>
              ) : (
                <a
                  href={whatsappUrl(`Hey ${m.name}! Add your budget & dates for ${t.name} — takes 90 seconds 🙏 ${link}`)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => toast(`Nudging ${m.name} on WhatsApp 👋`)}
                  className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200 active:scale-95"
                >
                  <Bell size={12} /> Nudge
                </a>
              )}
            </div>
          ))}
          {Array.from({ length: notJoined }).map((_, i) => (
            <div key={`slot-${i}`} className="flex items-center gap-3 py-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-full border-2 border-dashed border-slate-300 text-slate-400">
                <UserPlus size={15} />
              </div>
              <div className="flex-1 text-sm text-slate-400">Invite not opened yet</div>
              {i === 0 && (
                <button onClick={() => nav('/invite')} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  Share link
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {n > 0 && (
        <>
          <SectionTitle>Where the group overlaps</SectionTitle>

          {!t.destinationQuery && (
            <Card className="mb-3">
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-brand-500 text-3xl">✨</div>
                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Destination</div>
                  <div className="text-lg font-extrabold">AI picks the best match</div>
                  <div className="text-sm text-slate-500">Based on everyone’s interests, budget and dates</div>
                </div>
              </div>
            </Card>
          )}

          {/* Dates */}
          <Card className="mb-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold">📅 Common dates</div>
                {ov.best && (
                  <div className="mt-1 text-lg font-extrabold leading-tight">
                    {fmtDate(ov.best.dates[0])} – {fmtDate(ov.best.dates[ov.best.dates.length - 1])}
                  </div>
                )}
                <div className="text-sm text-slate-500">
                  {ov.best && ov.best.free === n ? `All ${n} who answered are free` : `${ov.best?.free ?? 0} of ${n} free for all ${t.days} days`}
                </div>
              </div>
              <span className="rounded-full bg-sea-50 px-2.5 py-1 text-xs font-bold text-sea-700">Best fit</span>
            </div>
            <div className="no-scrollbar -mx-4 mt-4 flex gap-1 overflow-x-auto px-4 pb-1">
              {ov.dateCounts.map(({ date, count }) => {
                const inBest = ov.best?.dates.includes(date)
                return (
                  <div key={date} className="flex w-9 shrink-0 flex-col items-center gap-1">
                    <div className="flex h-16 w-full items-end overflow-hidden rounded-lg bg-slate-100">
                      <div
                        className={cx('w-full rounded-lg transition-all', inBest ? 'bg-sea-500' : 'bg-slate-300')}
                        style={{ height: `${(count / Math.max(1, n)) * 100}%` }}
                      />
                    </div>
                    <div className={cx('text-[10px] font-semibold', inBest ? 'text-sea-700' : 'text-slate-400')}>{dayName(date).slice(0, 2)}</div>
                    <div className={cx('-mt-1 text-xs font-bold', inBest ? 'text-sea-700' : 'text-slate-500')}>{dayNum(date)}</div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Starting cities */}
          <Card className="mb-3">
            <div className="text-sm font-bold">🧳 Coming from</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {ov.origins.map((o) => (
                <span key={o.key} className={cx('rounded-full px-3 py-1.5 text-sm font-semibold ring-1', o.key === t.me.origin ? 'bg-brand-50 text-brand-700 ring-brand-200' : 'bg-slate-50 text-slate-700 ring-slate-200')}>
                  {o.key === LOCAL_ORIGIN ? '📍 Already there' : o.key} ×{o.count}
                </span>
              ))}
            </div>
            {ov.origins.length > 1 && <div className="mt-2 text-xs text-slate-500">Travel is planned from each city, so everyone’s cost is a little different.</div>}
          </Card>

          {/* Budget */}
          <Card className="mb-3">
            <div className="text-sm font-bold">💰 Budget range (per person)</div>
            <div className="mt-1 text-lg font-extrabold">
              {inr(ov.budget.min)} – {inr(ov.budget.max)}
            </div>
            <div className="relative mt-5 h-3 rounded-full bg-slate-100">
              <div className="absolute inset-y-0 rounded-full bg-gradient-to-r from-sea-400 to-brand-400" style={{ left: pct(ov.budget.min), right: `calc(100% - ${pct(ov.budget.max)})` }} />
              <div className="absolute -top-1 h-5 w-1 rounded-full bg-slate-900" style={{ left: pct(ov.budget.min) }} />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-400">
              <span>₹5k</span>
              <span>median {inr(ov.budget.median)}</span>
              <span>{inr(BMAX)}</span>
            </div>
            <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
              We’ll plan to <b>≤ {inr(ov.budget.min)}</b> so it works for everyone — individual budgets stay private.
            </div>
          </Card>

          {/* Interests */}
          <Card className="mb-3">
            <div className="text-sm font-bold">❤️ Shared interests</div>
            <div className="mt-3 space-y-2">
              {ov.interests.slice(0, 6).map(({ key, count }) => {
                const meta = INTERESTS.find((i) => i.id === key)!
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 text-sm font-medium">
                      {meta.emoji} {meta.label}
                    </div>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-400" style={{ width: `${(count / n) * 100}%` }} />
                    </div>
                    <div className="w-8 text-right text-xs font-bold text-slate-500">{count}/{n}</div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Style + food */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <div className="text-sm font-bold">🎒 Group vibe</div>
              <div className="mt-2 text-2xl">{STYLES.find((s) => s.id === ov.dominantStyle)?.emoji}</div>
              <div className="font-extrabold">Mostly {STYLES.find((s) => s.id === ov.dominantStyle)?.label.toLowerCase()}</div>
              <div className="mt-1 text-xs text-slate-500">
                {ov.styles.map((s) => `${STYLES.find((x) => x.id === s.key)?.emoji} ${s.count}`).join('  ')}
              </div>
            </Card>
            <Card>
              <div className="text-sm font-bold">🥗 Food</div>
              {ov.food.length ? (
                <div className="mt-2 space-y-1">
                  {ov.food.map((f) => (
                    <div key={f.key} className="text-sm">
                      <b>{f.count}</b> {f.key.toLowerCase()}
                    </div>
                  ))}
                  <div className="text-xs text-slate-500">Every meal will have options.</div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-600">No restrictions — eat everything! 😋</div>
              )}
            </Card>
          </div>
        </>
      )}

      <BottomBar>
        {t.locked ? null : isOrganizer ? (
          <>
            <Button full size="lg" disabled={n < 2} onClick={() => nav('/generating')}>
              <Sparkles size={18} /> {t.plan ? 'Regenerate plan' : 'Generate plan'}
              {waitingOn > 0 && n >= 2 && <span className="font-medium opacity-80">· {n} of {t.groupSize}</span>}
            </Button>
            {n < 2 && <div className="mt-2 text-center text-xs text-slate-500">Need at least 2 responses to generate.</div>}
          </>
        ) : (
          <div className="rounded-2xl bg-white p-3 text-center text-sm text-slate-600 ring-1 ring-slate-200">
            {organizer.name} will generate the plan.{' '}
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
        {ov.best && n >= 2 && !t.locked && (
          <div className="mt-2 text-center text-xs text-slate-400">
            Will plan for {fmtRange(ov.best.dates[0], ov.best.dates[ov.best.dates.length - 1])}
          </div>
        )}
      </BottomBar>
    </div>
  )
}
