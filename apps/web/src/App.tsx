import { useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { DemoBar } from './components/DemoBar'
import { useTrip } from './state/TripContext'
import Landing from './screens/Landing'
import CreateTrip from './screens/CreateTrip'
import Invite from './screens/Invite'
import JoinInvite from './screens/JoinInvite'
import PreferenceForm from './screens/PreferenceForm'
import Dashboard from './screens/Dashboard'
import Generating from './screens/Generating'
import Plan from './screens/Plan'
import Locked from './screens/Locked'

function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center pt-9 text-slate-400">
      <Loader2 className="animate-spin" />
    </div>
  )
}

/** Screens that need an open trip (and optionally a plan). */
function NeedsTrip({ children, plan }: { children: ReactNode; plan?: boolean }) {
  const { trip, ready } = useTrip()
  if (!ready) return <Loading />
  if (!trip) return <Navigate to="/new" replace />
  if (plan && !trip.plan) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/** Mobile-width app column for in-product screens. */
function AppColumn({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-dvh max-w-md bg-slate-50 px-4 pt-9 sm:shadow-[0_0_0_1px_rgba(15,23,42,.06)]">{children}</div>
}

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <DemoBar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/new" element={<AppColumn><CreateTrip /></AppColumn>} />
        <Route path="/j/:code" element={<AppColumn><JoinInvite /></AppColumn>} />
        <Route path="/invite" element={<NeedsTrip><AppColumn><Invite /></AppColumn></NeedsTrip>} />
        <Route path="/join" element={<NeedsTrip><AppColumn><PreferenceForm /></AppColumn></NeedsTrip>} />
        <Route path="/dashboard" element={<NeedsTrip><AppColumn><Dashboard /></AppColumn></NeedsTrip>} />
        <Route path="/generating" element={<NeedsTrip><Generating /></NeedsTrip>} />
        <Route path="/plan" element={<NeedsTrip plan><AppColumn><Plan /></AppColumn></NeedsTrip>} />
        <Route path="/locked" element={<NeedsTrip plan><Locked /></NeedsTrip>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
