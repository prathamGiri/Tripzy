/** Landing page for an invite link (/j/:code): see the trip, enter your name, join — no sign-up. */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { fmtRange, POPULAR_DESTINATIONS, type InvitePreview } from '@tripzy/shared'
import { api } from '../lib/api'
import { gradient } from '../lib/gradients'
import { useTrip } from '../state/TripContext'
import { useAction } from '../components/Toast'
import { AvatarStack, BottomBar, Button } from '../components/ui'

export default function JoinInvite() {
  const { code = '' } = useParams()
  const nav = useNavigate()
  const { joinInvite, isMemberOf, openTrip } = useTrip()
  const [run, busy] = useAction()
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')

  useEffect(() => {
    api.invite(code).then(setPreview, (e: Error) => setError(e.message))
  }, [code])

  if (error)
    return (
      <div className="flex min-h-[calc(100dvh-36px)] flex-col items-center justify-center text-center">
        <div className="text-5xl">🔗</div>
        <h1 className="mt-4 text-xl font-extrabold">{error}</h1>
        <p className="mt-1 text-slate-500">Ask your friend to send the link again.</p>
        <Button className="mt-6" variant="secondary" onClick={() => nav('/')}>
          Go to Tripzy
        </Button>
      </div>
    )
  if (!preview)
    return (
      <div className="grid min-h-[calc(100dvh-36px)] place-items-center text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    )

  const popular = POPULAR_DESTINATIONS.find((d) => d.name === preview.destinationQuery)
  const already = isMemberOf(preview.tripId)

  return (
    <div className="flex min-h-[calc(100dvh-36px)] animate-fade-up flex-col pt-6">
      <div className={`rounded-[2rem] bg-gradient-to-br ${gradient(popular?.gradient)} p-6 text-white shadow-lift`}>
        <div className="text-sm font-medium opacity-90">{preview.organizerName} invited you</div>
        <div className="mt-5 text-5xl">{popular?.emoji ?? (preview.destinationQuery ? '📍' : '✨')}</div>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight">{preview.tripName}</h1>
        <div className="mt-1 opacity-90">
          {preview.destinationQuery ?? 'Destination picked by the group'} · {preview.days} days · sometime {fmtRange(preview.windowStart, preview.windowEnd)}
        </div>
        <div className="mt-5 flex items-center gap-2 text-sm">
          <AvatarStack members={preview.members} size={26} />
          <span className="opacity-90">
            {preview.respondedCount} of {preview.groupSize} already in
          </span>
        </div>
      </div>

      {already ? (
        <div className="mt-6 space-y-3 px-1">
          <h2 className="text-xl font-bold">You’re already part of this trip 👋</h2>
          <Button
            full
            size="lg"
            onClick={() => {
              openTrip(preview.tripId)
              nav('/dashboard')
            }}
          >
            Open the trip <ArrowRight size={18} />
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3 px-1">
            <h2 className="text-xl font-bold">Join in 90 seconds</h2>
            <p className="text-slate-600">Tell us your budget, vibe and free dates. Tripzy plans a trip that works for everyone — no endless group chat.</p>
            <label className="block">
              <div className="mb-1.5 text-sm font-bold text-slate-800">Your name</div>
              <input
                autoFocus
                className="w-full rounded-2xl bg-white px-4 py-3 text-[15px] font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400"
                placeholder="e.g. Kabir"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">🙅 No sign-up</span>
              <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">🔒 Budget stays private</span>
            </div>
          </div>
          <div className="flex-1" />
          <BottomBar>
            <Button
              full
              size="lg"
              disabled={!name.trim() || busy}
              onClick={() =>
                run(async () => {
                  await joinInvite(code, name.trim())
                  nav('/join', { state: { skipWelcome: true } })
                })
              }
            >
              {busy ? 'Joining…' : 'Join the trip'} <ArrowRight size={18} />
            </Button>
          </BottomBar>
        </>
      )}
    </div>
  )
}
