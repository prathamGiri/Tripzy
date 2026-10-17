import { useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarCheck, Hotel, IndianRupee, Plane, Repeat2, ThumbsUp, Sparkles } from 'lucide-react'
import { Button, Logo } from '../components/ui'
import { useTrip } from '../state/TripContext'
import { useAction } from '../components/Toast'

const CHAT = [
  { who: 'Rohan', text: 'GOA TRIP?? 🏖️🏖️', day: 'Day 1', me: false },
  { who: 'Aisha', text: 'yesss im in', day: '', me: false },
  { who: 'Meera', text: 'which dates tho', day: 'Day 3', me: false },
  { who: 'Kabir', text: 'budget kitna hai?', day: 'Day 6', me: false },
  { who: 'You', text: 'guys can we decide pls 😭', day: 'Day 11', me: true },
  { who: 'Neha', text: 'sorry cant make it now', day: 'Day 19', me: false },
]

const FEATURES = [
  { icon: CalendarCheck, title: 'Dates that work', text: 'We find the days everyone is actually free.' },
  { icon: IndianRupee, title: 'Fits every budget', text: 'Planned to the tightest budget, so nobody gets stretched.' },
  { icon: Sparkles, title: 'Full day-by-day plan', text: 'Times, places, food, and why each pick suits your group.' },
  { icon: Plane, title: 'Travel sorted', text: 'Trains, flights, buses and local transport — all priced.' },
  { icon: Hotel, title: 'Stays for the group', text: 'Villas, hostels, resorts — one place for all of you.' },
  { icon: ThumbsUp, title: 'Vote, don’t debate', text: '👍 / 👎 or swap an activity in one tap. Done.' },
]

export default function Landing() {
  const nav = useNavigate()
  const { trip, quickDemo } = useTrip()
  const [run, busy] = useAction()

  return (
    <div className="min-h-dvh overflow-x-hidden bg-white pt-9">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          {trip && (
            <Button variant="ghost" size="sm" onClick={() => nav('/dashboard')}>
              My trip
            </Button>
          )}
          <Button size="sm" onClick={() => nav('/new')}>
            Plan a trip
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-brand-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-48 h-72 w-72 rounded-full bg-sea-200/50 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 sm:px-6 md:grid-cols-2 md:pt-12">
          <div className="animate-fade-up">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 ring-1 ring-brand-100">
              ⚡ Group trips, minus the group-chat chaos
            </div>
            <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Your whole group.
              <br />
              One plan.
              <br />
              <span className="bg-gradient-to-r from-brand-500 to-pink-500 bg-clip-text text-transparent">Under 10 minutes.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-slate-600">
              Everyone shares their budget, dates and vibe once — in 90 seconds. We build a complete trip that fits the whole group:
              itinerary, stays, travel and cost per person.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => nav('/new')}>
                Plan a trip <ArrowRight size={18} />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await quickDemo()
                    nav('/generating')
                  })
                }
              >
                {busy ? 'Setting up…' : 'See a sample plan'}
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-3 text-sm text-slate-500">
              <div className="flex -space-x-2">
                {['bg-brand-500', 'bg-sea-600', 'bg-violet-500', 'bg-amber-500'].map((c, i) => (
                  <div key={c} className={`h-7 w-7 rounded-full ring-2 ring-white ${c} grid place-items-center text-xs font-bold text-white`}>
                    {'ARMK'[i]}
                  </div>
                ))}
              </div>
              Free · No sign-up needed for friends
            </div>
          </div>

          {/* Phone mock */}
          <div className="relative mx-auto w-full max-w-[340px] animate-fade-up [animation-delay:.1s]">
            <div className="rounded-[2.5rem] bg-slate-900 p-3 shadow-lift">
              <div className="overflow-hidden rounded-[2rem] bg-slate-50">
                <div className="bg-gradient-to-br from-orange-400 via-brand-500 to-pink-500 p-5 text-white">
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Trip locked 🔒</div>
                  <div className="mt-1 text-2xl font-extrabold">Goa with the gang</div>
                  <div className="mt-1 text-sm opacity-90">Fri 18 – Mon 21 Dec · 6 friends</div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-xs opacity-80">per person</div>
                      <div className="text-2xl font-extrabold">₹18,750</div>
                    </div>
                    <div className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold backdrop-blur">✓ under everyone’s budget</div>
                  </div>
                </div>
                <div className="space-y-2.5 p-4">
                  {[
                    ['11:00', '🏖️', 'Ashwem & Morjim beaches', '👍 5'],
                    ['16:30', '🥁', 'Arambol drum circle', '👍 4'],
                    ['19:30', '🛍️', 'Saturday Night Market', '👍 6'],
                  ].map(([t, e, title, v]) => (
                    <div key={title} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft">
                      <div className="text-xs font-semibold text-slate-400">{t}</div>
                      <div className="text-xl">{e}</div>
                      <div className="flex-1 text-sm font-semibold">{title}</div>
                      <div className="rounded-full bg-sea-50 px-2 py-0.5 text-xs font-semibold text-sea-700">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -left-6 top-24 hidden rotate-[-6deg] rounded-2xl bg-white px-3 py-2 text-sm font-semibold shadow-lift sm:block">
              ⏱️ Planned in 7 min
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <div className="mx-auto max-w-sm rounded-3xl bg-[#e7ded3] p-4 shadow-soft">
              <div className="mb-3 text-center text-xs font-semibold text-slate-500">GOA TRIP 2026 🌴🌴 · 6 members</div>
              <div className="space-y-2">
                {CHAT.map((c, i) => (
                  <div key={i}>
                    {c.day && <div className="my-2 text-center text-[11px] font-semibold text-slate-500">{c.day}</div>}
                    <div className={`flex ${c.me ? 'justify-end' : ''}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-sm shadow-sm ${c.me ? 'bg-[#d9fdd3]' : 'bg-white'}`}>
                        {!c.me && <div className="text-[11px] font-bold text-sea-700">{c.who}</div>}
                        {c.text}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="my-2 text-center text-[11px] font-semibold text-slate-500">Day 34</div>
                <div className="text-center text-xs italic text-slate-500">Trip didn’t happen.</div>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="text-sm font-bold uppercase tracking-wider text-brand-600">Sound familiar?</div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Group trips die in the group chat.</h2>
            <p className="mt-4 text-lg text-slate-600">
              Nobody agrees on dates. Nobody says their budget out loud. The planning drags on for weeks — and one by one, people drop
              out.
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-800">Tripzy turns weeks of back-and-forth into one 10-minute plan.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">How it works</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ['1', 'Create & share', 'Pick a destination (or let us suggest one), rough dates and group size. Share one link on WhatsApp.', '1 min'],
              ['2', 'Everyone answers once', 'Budget, travel style, interests, food and dates — a 90-second form, no app or sign-up.', '90 sec each'],
              ['3', 'Get the plan, vote, lock', 'A full itinerary that fits the whole group. 👍 / 👎 or swap items, then lock it in.', '5 min'],
            ].map(([n, t, d, time]) => (
              <div key={n} className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-900/5">
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500 text-lg font-extrabold text-white">{n}</div>
                  <div className="rounded-full bg-sea-50 px-2.5 py-1 text-xs font-semibold text-sea-700">⏱ {time}</div>
                </div>
                <div className="mt-4 text-lg font-bold">{t}</div>
                <p className="mt-1 text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-900 py-16 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Everything the group chat never figures out.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
                <f.icon className="text-brand-400" size={24} />
                <div className="mt-3 font-bold">{f.title}</div>
                <p className="mt-1 text-sm text-slate-400">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Repeat2 className="mx-auto text-brand-500" size={32} />
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Stop planning. Start packing.</h2>
          <p className="mt-3 text-lg text-slate-600">Create a trip, drop the link in your group, and have a plan before the chat goes quiet.</p>
          <Button size="lg" className="mt-7" onClick={() => nav('/new')}>
            Plan a trip <ArrowRight size={18} />
          </Button>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">© 2026 Tripzy · Made for groups who actually want to go.</footer>
    </div>
  )
}
