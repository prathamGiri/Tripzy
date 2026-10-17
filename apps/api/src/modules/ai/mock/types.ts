/** Shape of the hand-written sample destinations used by the mock planner. */
import type { Tag, Tier } from '@tripzy/shared'

export type Origin = 'Mumbai' | 'Delhi' | 'Bengaluru' | 'Pune'

export interface Travel {
  mode: string
  mins: number
  cost: number
}

export interface Alt {
  id: string
  emoji: string
  title: string
  place: string
  cost: number
  tags: Tag[]
  why: string
}

export interface Activity extends Alt {
  time: string
  travel?: Travel
  alts?: Alt[]
}

export interface DayTemplate {
  id: string
  title: string
  tags: Tag[]
  items: Activity[]
}

export interface Stay {
  id: string
  name: string
  area: string
  emoji: string
  kind: string
  tier: Tier
  pricePerNight: number
  rating: number
  perks: string[]
  why: string
}

export interface TransportOption {
  id: string
  mode: 'flight' | 'train' | 'bus'
  label: string
  duration: string
  depart: string
  price: number
  note: string
}

export interface Destination {
  id: string
  name: string
  region: string
  emoji: string
  gradient: string
  tagline: string
  bestFor: Tag[]
  foodPerDay: Record<Tier, number>
  getThere: Record<Origin, TransportOption[]>
  stays: Stay[]
  arrival: DayTemplate
  days: DayTemplate[]
  departure: DayTemplate
}
