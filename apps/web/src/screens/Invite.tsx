import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Copy, MessageCircle, Share2 } from 'lucide-react'
import { fmtRange, POPULAR_DESTINATIONS } from '@tripzy/shared'
import { gradient } from '../lib/gradients'
import { inviteUrl, whatsappUrl } from '../lib/share'
import { useTrip } from '../state/TripContext'
import { useAction, useToast } from '../components/Toast'
import { BottomBar, Button, Card, PageHeader } from '../components/ui'

export default function Invite() {
  const nav = useNavigate()
  const toast = useToast()
  const [run] = useAction()
  const { trip, switchMember } = useTrip()
  const [copied, setCopied] = useState(false)
  if (!trip) return null

  const popular = POPULAR_DESTINATIONS.find((d) => d.name === trip.destinationQuery)
  const link = inviteUrl(trip.inviteCode)
  const organizer = trip.members.find((m) => m.isOrganizer)!
  const message = `Planning ${trip.name}! Add your budget & dates — takes 90 seconds, then we get the full plan 🙌 ${link}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      /* clipboard blocked — the link is still visible */
    }
    setCopied(true)
    toast('Link copied — paste it in your group chat')
    setTimeout(() => setCopied(false), 2000)
  }

  const share = async () => {
    if (navigator.share) await navigator.share({ title: trip.name, text: message, url: link }).catch(() => {})
    else copy()
  }

  const pendingFriend = trip.members.find((m) => !m.isOrganizer && !m.responded)

  return (
    <div className="animate-fade-up">
      <PageHeader back="/dashboard" title="Invite your group" />

      <div className="mt-2 flex flex-col items-center text-center">
        <div className="grid h-20 w-20 animate-pop place-items-center rounded-full bg-sea-50 text-4xl ring-8 ring-sea-50/50">🎉</div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">“{trip.name}” is ready</h1>
        <p className="mt-1 text-slate-500">
          {trip.destinationQuery ? `${popular?.emoji ?? '📍'} ${trip.destinationQuery}` : '✨ AI picks the destination'} · {fmtRange(trip.windowStart, trip.windowEnd)} · {trip.days} days · {trip.groupSize} people
        </p>
      </div>

      <Card className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Invite link</div>
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-slate-50 p-1.5 pl-4 ring-1 ring-slate-200">
          <div className="flex-1 truncate font-mono text-sm font-semibold text-slate-700">{link.replace(/^https?:\/\//, '')}</div>
          <Button size="sm" variant={copied ? 'sea' : 'dark'} onClick={copy}>
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={whatsappUrl(message)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-3 py-2 text-sm font-semibold text-white transition active:scale-[.98]"
          >
            <MessageCircle size={16} /> WhatsApp
          </a>
          <Button variant="secondary" size="sm" onClick={share}>
            <Share2 size={16} /> More options
          </Button>
        </div>
      </Card>

      <Card className="mt-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">What your friends will see</div>
        <div className="mt-3 rounded-2xl bg-[#e7ded3] p-3">
          <div className="ml-auto max-w-[85%] rounded-2xl bg-[#d9fdd3] p-2.5 text-sm shadow-sm">
            <div className={`mb-2 rounded-xl bg-gradient-to-br ${gradient(popular?.gradient)} p-3 text-white`}>
              <div className="text-xs font-semibold opacity-80">tripzy.app</div>
              <div className="font-bold">
                {organizer.name} invited you to {trip.name}
              </div>
              <div className="text-xs opacity-90">Add your budget & dates · takes 90 sec</div>
            </div>
            Guys fill this in, takes 1 min. Plan by tonight 🙏
            <div className="mt-0.5 text-right text-[10px] text-slate-500">10:42 ✓✓</div>
          </div>
        </div>
      </Card>

      {trip.demo && (
        <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-100">
          💡 <b>Demo tip:</b> open the invite link in another browser or phone to join as a real friend — or use the DEMO bar to switch people.
        </div>
      )}

      <BottomBar>
        <div className="space-y-2">
          {!trip.me.prefs && (
            <Button full size="lg" onClick={() => nav('/join')}>
              Add my own preferences first
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            {trip.demo && pendingFriend ? (
              <Button
                variant="secondary"
                onClick={() =>
                  run(async () => {
                    await switchMember(pendingFriend.id)
                    toast(`Now viewing as ${pendingFriend.name}`)
                    nav('/join')
                  })
                }
              >
                Open as {pendingFriend.name}
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => window.open(link, '_blank')}>
                Open invite link
              </Button>
            )}
            <Button variant={trip.me.prefs ? 'primary' : 'secondary'} onClick={() => nav('/dashboard')}>
              Group dashboard
            </Button>
          </div>
        </div>
      </BottomBar>
    </div>
  )
}
