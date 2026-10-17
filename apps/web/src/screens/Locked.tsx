import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus, Check, Copy, ExternalLink, MessageCircle } from 'lucide-react'
import { agreement, applySwaps, effectiveStay, effectiveTransport, fmtDate, inr, personalCost, votableIds, type BookingLink } from '@tripzy/shared'
import { gradient } from '../lib/gradients'
import { inviteUrl, whatsappUrl } from '../lib/share'
import { useTrip } from '../state/TripContext'
import { useToast } from '../components/Toast'
import { AvatarStack, Button } from '../components/ui'

const COLORS = ['#f95d36', '#06c4af', '#facc15', '#a78bfa', '#38bdf8', '#f472b6']

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        dur: 2.4 + Math.random() * 1.8,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 6,
        round: Math.random() > 0.5,
      })),
    [],
  )
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 1.6),
            background: p.color,
            borderRadius: p.round ? 999 : 2,
            animation: `confetti ${p.dur}s ${p.delay}s ease-in forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  )
}

function BookRow({ emoji, title, sub, links, status }: { emoji: string; title: string; sub: string; links: BookingLink[]; status: string | null }) {
  return (
    <div className={`rounded-2xl p-3 ${status ? 'bg-sea-50 ring-1 ring-sea-100' : 'bg-slate-50'}`}>
      <div className="flex items-start gap-2">
        <div className="text-xl">{emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold leading-snug">{title}</div>
          <div className="text-xs text-slate-500">{sub}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${status ? 'bg-sea-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
          {status ?? '⏳ To book'}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {links.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
            {l.label} <ExternalLink size={11} />
          </a>
        ))}
      </div>
    </div>
  )
}

export default function Locked() {
  const nav = useNavigate()
  const toast = useToast()
  const { trip } = useTrip()
  const t = trip!
  const plan = t.plan!
  const doc = plan.doc
  const days = applySwaps(doc.days, plan.swaps)
  const stay = effectiveStay(plan)
  const origin = t.me.origin
  const transport = effectiveTransport(plan, origin)
  const costs = personalCost(plan, origin)
  const totals = doc.travel.map((g) => personalCost(plan, g.origin).total)
  const nameOf = (id: string) => t.members.find((m) => m.id === id)?.name ?? 'someone'
  const bookedStatus = (b: { bookedBy: { memberId: string } } | null | undefined) => (b ? `✓ Booked by ${nameOf(b.bookedBy.memberId)}` : null)
  const modeEmoji = (m: string) => (m === 'flight' ? '✈️' : m === 'train' ? '🚆' : m === 'bus' ? '🚌' : '🚗')
  const [copied, setCopied] = useState(false)
  const agree = agreement(plan.votes, votableIds(days, stay.id))
  const start = doc.dates[0]
  const end = doc.dates[doc.dates.length - 1]

  const shareText = [
    `🔒 ${t.name} is ${t.locked ? 'LOCKED' : 'planned'}!`,
    `${doc.destination.emoji} ${doc.destination.name} · ${fmtDate(start)} → ${fmtDate(end)}`,
    `🏡 ${stay.name}`,
    ...doc.travel.map((g) => `🧳 From ${g.origin}: ${effectiveTransport(plan, g.origin)?.label ?? 'to be chosen'}`),
    totals.length > 1 ? `💰 ${inr(Math.min(...totals))}–${inr(Math.max(...totals))} per person, all-in (depends on city)` : `💰 ${inr(costs.total)} per person, all-in`,
    '',
    ...days.map((d, i) => `Day ${i + 1}: ${d.title}`),
    '',
    `Full plan 👉 ${inviteUrl(t.inviteCode)}`,
  ].join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
    } catch {
      /* clipboard blocked */
    }
    setCopied(true)
    toast('Summary copied — paste it in the group')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`min-h-dvh bg-gradient-to-br ${gradient(doc.destination.gradient)} pt-9`}>
      <Confetti />
      <div className="mx-auto max-w-md px-4 pb-10 pt-8">
        <div className="text-center text-white">
          <div className="mx-auto grid h-20 w-20 animate-pop place-items-center rounded-full bg-white text-4xl shadow-lift">🔒</div>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight">Trip locked!</h1>
          <p className="mt-2 text-white/90">
            {t.members.length} friends · {agree}% agreement · planned in minutes ⚡
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-[2rem] bg-white shadow-lift">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Final plan</div>
                <div className="text-2xl font-extrabold">{t.name}</div>
              </div>
              <div className="text-4xl">{doc.destination.emoji}</div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <AvatarStack members={t.members} size={28} max={6} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">When</div>
                <div className="font-bold">{fmtDate(start)}</div>
                <div className="font-bold">→ {fmtDate(end)}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Your cost</div>
                <div className="text-xl font-extrabold">{inr(costs.total)}</div>
                <div className="text-xs font-semibold text-sea-700">all-in ✓</div>
              </div>
            </div>

            <div className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Book it</div>
            <div className="mt-2 space-y-2">
              {transport && (
                <BookRow
                  emoji={modeEmoji(transport.mode)}
                  title={`Your travel: ${transport.label}`}
                  sub={[transport.duration, `from ${origin}`, `${inr(transport.price * 2)} return per person`].filter(Boolean).join(' · ')}
                  links={transport.links}
                  status={bookedStatus(plan.bookings.travel[origin])}
                />
              )}
              <BookRow emoji={stay.emoji} title={stay.name} sub={`${costs.nights} nights · ${stay.wholeProperty ? "whole place" : `${stay.rooms} rooms`} · ${inr(stay.roomRate)}/${stay.wholeProperty ? "night" : "room/night"} incl. taxes${stay.priceSource === "booked" ? "" : stay.priceSource === "web" ? " · price checked on the web" : " · estimate"}`} links={stay.links} status={bookedStatus(plan.bookings.stay)} />
            </div>

            <div className="mt-5 space-y-2">
              {days.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-xs font-extrabold text-brand-700">D{i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{d.title}</div>
                    <div className="truncate text-xs text-slate-500">{d.items.map((a) => a.emoji).join(' ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-3xl bg-white/15 p-4 text-white backdrop-blur">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/80">Share to group</div>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed">{shareText}</pre>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href={whatsappUrl(shareText)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-[15px] font-semibold text-white"
          >
            <MessageCircle size={18} /> WhatsApp
          </a>
          <Button variant="secondary" onClick={copy}>
            {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="secondary" className="col-span-2" onClick={() => toast('Calendar invites are coming soon')}>
            <CalendarPlus size={18} /> Add to everyone’s calendar
          </Button>
        </div>

        <div className="mt-6 flex justify-center gap-4 text-sm font-semibold text-white">
          <button onClick={() => nav('/plan')} className="underline-offset-4 hover:underline">
            View full plan
          </button>
          <span className="opacity-50">·</span>
          <button onClick={() => nav('/new')} className="underline-offset-4 hover:underline">
            Plan another trip
          </button>
        </div>
      </div>
    </div>
  )
}
