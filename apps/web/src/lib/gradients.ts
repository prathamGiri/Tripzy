import type { GradientKey } from '@tripzy/shared'

/** Tailwind classes for each destination gradient (kept literal so Tailwind can see them). */
export const GRADIENTS: Record<GradientKey, string> = {
  sunset: 'from-orange-400 via-brand-500 to-pink-500',
  ocean: 'from-sky-500 via-indigo-500 to-violet-600',
  rose: 'from-pink-500 via-rose-500 to-amber-500',
  forest: 'from-emerald-500 via-teal-500 to-sky-600',
  violet: 'from-violet-500 via-fuchsia-500 to-brand-500',
  desert: 'from-amber-400 via-orange-500 to-rose-500',
}

export const gradient = (k: GradientKey | undefined | null) => GRADIENTS[k ?? 'violet'] ?? GRADIENTS.violet
