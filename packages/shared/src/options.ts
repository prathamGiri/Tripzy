import type { GradientKey, Interest, Style, Tag } from './types'

export const STYLES: { id: Style; label: string; emoji: string; blurb: string }[] = [
  { id: 'relaxed', label: 'Relaxed', emoji: '🌴', blurb: 'Slow mornings, beaches, naps' },
  { id: 'packed', label: 'Packed', emoji: '⚡', blurb: 'See and do everything' },
  { id: 'adventure', label: 'Adventure', emoji: '🧗', blurb: 'Treks, water sports, adrenaline' },
  { id: 'party', label: 'Party', emoji: '🪩', blurb: 'Late nights, clubs, music' },
  { id: 'culture', label: 'Culture', emoji: '🏛️', blurb: 'History, local life, food' },
]

export const INTERESTS: { id: Interest; label: string; emoji: string }[] = [
  { id: 'food', label: 'Food', emoji: '🍜' },
  { id: 'beaches', label: 'Beaches', emoji: '🏖️' },
  { id: 'nature', label: 'Nature', emoji: '🌿' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🌙' },
  { id: 'history', label: 'History', emoji: '🏰' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'adventure', label: 'Adventure', emoji: '🪂' },
  { id: 'photography', label: 'Photos', emoji: '📸' },
  { id: 'wellness', label: 'Wellness', emoji: '🧘' },
]

export const STYLE_IDS = STYLES.map((s) => s.id) as [Style, ...Style[]]
export const INTEREST_IDS = INTERESTS.map((i) => i.id) as [Interest, ...Interest[]]
export const TAG_IDS = [...new Set([...STYLE_IDS, ...INTEREST_IDS])] as [Tag, ...Tag[]]

export const FOOD_OPTIONS = ['Vegetarian', 'Vegan', 'Jain', 'No seafood', 'No pork', 'No beef', 'Halal', 'Don’t drink']

export const ORIGINS = ['Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad']

export const POPULAR_DESTINATIONS: { name: string; emoji: string; tagline: string; gradient: GradientKey }[] = [
  { name: 'Goa', emoji: '🏖️', tagline: 'Beaches, shacks and long nights', gradient: 'sunset' },
  { name: 'Manali', emoji: '🏔️', tagline: 'Snow, pine forests, cafés', gradient: 'ocean' },
  { name: 'Jaipur', emoji: '🏰', tagline: 'Forts, bazaars, royal food', gradient: 'rose' },
  { name: 'Udaipur', emoji: '🏯', tagline: 'Lakes and palaces', gradient: 'desert' },
  { name: 'Rishikesh', emoji: '🛶', tagline: 'Rafting, yoga, the Ganga', gradient: 'forest' },
  { name: 'Kerala', emoji: '🌴', tagline: 'Backwaters and hills', gradient: 'forest' },
  { name: 'Pondicherry', emoji: '🥖', tagline: 'French quarter by the sea', gradient: 'violet' },
  { name: 'Coorg', emoji: '☕', tagline: 'Coffee estates and mist', gradient: 'forest' },
]

export const TAG_META: Record<Tag, { label: string; emoji: string }> = {
  ...Object.fromEntries(STYLES.map((s) => [s.id, { label: s.label, emoji: s.emoji }])),
  ...Object.fromEntries(INTERESTS.map((i) => [i.id, { label: i.label, emoji: i.emoji }])),
} as Record<Tag, { label: string; emoji: string }>

export const AVATAR_COLORS = [
  'bg-brand-500', 'bg-sea-600', 'bg-violet-500', 'bg-amber-500', 'bg-sky-500', 'bg-pink-500', 'bg-emerald-600', 'bg-indigo-500',
]

export const GRADIENT_KEYS: GradientKey[] = ['sunset', 'ocean', 'rose', 'forest', 'violet', 'desert']

/** Stable gradient for any destination name. */
export function gradientFor(name: string): GradientKey {
  const known = POPULAR_DESTINATIONS.find((d) => d.name.toLowerCase() === name.trim().toLowerCase())
  if (known) return known.gradient
  let h = 0
  for (const c of name.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) | 0
  return GRADIENT_KEYS[Math.abs(h) % GRADIENT_KEYS.length]
}

/** Starting-city value for people who are already at the destination (no travel to book). */
export const LOCAL_ORIGIN = 'Already there'

/** Canonical spelling for a starting city: matches the ORIGINS list case-insensitively, else Title Case. */
export function normalizeOrigin(s: string | null | undefined, fallback = 'Mumbai'): string {
  const t = (s ?? '').trim().replace(/\s+/g, ' ')
  if (!t) return fallback
  if (t.toLowerCase() === LOCAL_ORIGIN.toLowerCase()) return LOCAL_ORIGIN
  const known = ORIGINS.find((o) => o.toLowerCase() === t.toLowerCase())
  return known ?? t.replace(/\b\w/g, (c) => c.toUpperCase())
}
