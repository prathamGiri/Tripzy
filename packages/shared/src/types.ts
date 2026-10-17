/**
 * Domain types shared by the API, the website and the mobile app.
 * Anything sent over the wire is described here.
 */

export type Style = 'relaxed' | 'packed' | 'adventure' | 'party' | 'culture'
export type Interest =
  | 'food'
  | 'nature'
  | 'nightlife'
  | 'history'
  | 'shopping'
  | 'beaches'
  | 'adventure'
  | 'photography'
  | 'wellness'
export type Tag = Style | Interest
export type Tier = 'budget' | 'mid' | 'premium'
export type Vote = 'up' | 'down'
export type TransportMode = 'flight' | 'train' | 'bus' | 'car'

export interface Preferences {
  budget: number // per person, all-in, INR
  style: Style
  interests: Interest[]
  food: string[]
  dates: string[] // YYYY-MM-DD the person is free
  /** City they travel from, or LOCAL_ORIGIN if already at the destination. Missing = the trip's default origin. */
  origin?: string
  completedInSec?: number
}

/* ------------------------------------------------------------------ */
/* Plan document — produced by the AI (or mock) generator, stored as-is */
/* ------------------------------------------------------------------ */

export interface BookingLink {
  provider: string // e.g. 'booking', 'makemytrip', 'google'
  label: string // button text
  url: string
}

export interface Travel {
  mode: string
  mins: number
  cost: number // per person
}

export interface Alt {
  id: string
  emoji: string
  title: string
  place: string
  cost: number // per person
  tags: Tag[]
  why: string
}

export interface Activity extends Alt {
  time: string // HH:MM
  travel: Travel | null // from the previous item
  alts: Alt[]
  /** Set when an itinerary update changed this item (time, travel or content). */
  updated?: boolean
}

export interface PlanDay {
  date: string
  title: string
  items: Activity[]
}

/** Where a stay's price came from: checked on the web for these dates, the AI's own estimate, or offline sample data. */
export type PriceSource = 'web' | 'estimate' | 'sample' | 'booked'

export interface Stay {
  id: string
  name: string
  area: string
  emoji: string
  kind: string
  tier: Tier
  /** Per person per night = roomRate × rooms ÷ group size. Used for all cost maths. */
  pricePerNight: number
  /** What the property charges per room per night (or for the whole villa), taxes included. */
  roomRate: number
  rooms: number
  guestsPerRoom: number
  wholeProperty: boolean
  priceSource: PriceSource
  priceNote: string | null // e.g. "Mid-Dec rates on MakeMyTrip: ₹9.8k–12.5k/room incl. taxes"
  sources: { label: string; url: string }[]
  rating: number | null
  perks: string[]
  why: string
  links: BookingLink[]
}

export interface TransportOption {
  id: string
  mode: TransportMode
  label: string
  duration: string
  depart: string
  /** Arrival time at the destination (HH:MM), if known. */
  arrive?: string | null
  /** Departure time of the return journey on the last day (HH:MM), if known. */
  returnDepart?: string | null
  price: number // one-way, per person
  note: string
  links: BookingLink[]
}

/** Travel options from one starting city. Empty for people already at the destination. */
export interface TravelGroup {
  origin: string
  options: TransportOption[]
}

export type GradientKey = 'sunset' | 'ocean' | 'rose' | 'forest' | 'violet' | 'desert'

export interface PlanDestination {
  name: string
  region: string
  emoji: string
  tagline: string
  gradient: GradientKey
}

export interface PlanDocument {
  destination: PlanDestination
  /** The trip's default starting city. */
  origin: string
  dates: string[]
  days: PlanDay[]
  stays: Stay[]
  /** Travel options per starting city. */
  travel: TravelGroup[]
  foodPerDay: number // per person per day
  tips: string[]
  source: 'ai' | 'mock'
  model: string | null
  /** When hotel prices were checked on the web (ISO time), or null if they are estimates. */
  pricesCheckedAt: string | null
  /** What the last itinerary update changed, for the group. */
  updateNote?: string | null
  generatedWith: number // how many responses the plan was built from
}

/* ------------------------------------------------------------------ */
/* API views                                                           */
/* ------------------------------------------------------------------ */

/** Who did something, and when (ISO). */
export interface ChangeInfo {
  memberId: string
  at: string
}

export interface Booking {
  kind: 'stay' | 'travel'
  origin: string | null // travel bookings: which starting city
  optionId: string | null // the suggested option that was booked, or null for something else
  /** What was booked (snapshot), with priceSource "booked". Stay for kind=stay, TransportOption for kind=travel. */
  stay: Stay | null
  transport: TransportOption | null
  reference: string | null
  link: string | null
  bookedBy: ChangeInfo
}

export interface PlanView {
  id: string
  version: number
  doc: PlanDocument
  stayId: string
  /** Chosen travel option per starting city. */
  transportIds: Record<string, string>
  votes: Record<string, Record<string, Vote>> // itemId -> memberId -> vote
  swaps: Record<string, string> // original activity id -> alternative id
  swapsBy: Record<string, ChangeInfo> // original activity id -> who swapped it
  /** Who last changed the stay / each city's travel. */
  changes: { stay: ChangeInfo | null; travel: Record<string, ChangeInfo> }
  bookings: { stay: Booking | null; travel: Record<string, Booking> }
  /** Set when stay/travel changed since the itinerary was last planned. */
  stale: { reason: string; at: string } | null
  /** A running itinerary update, if any. */
  adjustJobId: string | null
}

/** What everyone can see about a member. Budgets are never exposed individually. */
export interface MemberView {
  id: string
  name: string
  color: string
  isOrganizer: boolean
  responded: boolean
  respondedAt: string | null
  style: Style | null
  interests: Interest[]
  origin: string | null
  completedInSec: number | null
}

export interface Count<K extends string = string> {
  key: K
  count: number
}

export interface OverlapSummary {
  respondedCount: number
  windowDates: string[]
  dateCounts: { date: string; count: number }[]
  best: { dates: string[]; free: number } | null
  budget: { min: number; max: number; median: number }
  interests: Count<Interest>[]
  styles: Count<Style>[]
  food: Count[]
  origins: Count[]
  dominantStyle: Style | null
}

export interface TripView {
  id: string
  name: string
  destinationQuery: string | null // null = "suggest one for us"
  origin: string
  windowStart: string
  windowEnd: string
  days: number
  groupSize: number
  inviteCode: string
  locked: boolean
  members: MemberView[]
  overlap: OverlapSummary
  plan: PlanView | null
  budgetFit: { fits: number; of: number } | null
  me: {
    memberId: string
    isOrganizer: boolean
    prefs: Preferences | null
    /** Where this member travels from (their answer, or the trip default). */
    origin: string
    canEditStay: boolean
    /** Starting cities whose travel this member may choose or book. */
    editableOrigins: string[]
  }
  demo: boolean
}

export interface InvitePreview {
  code: string
  tripId: string
  tripName: string
  organizerName: string
  destinationQuery: string | null
  windowStart: string
  windowEnd: string
  days: number
  groupSize: number
  memberCount: number
  respondedCount: number
  members: { name: string; color: string }[]
}

export type JobStatus = 'queued' | 'running' | 'done' | 'failed'

export interface JobView {
  id: string
  status: JobStatus
  stage: string
  error: string | null
}

export interface MemberToken {
  tripId: string
  memberId: string
  name: string
  token: string
}
