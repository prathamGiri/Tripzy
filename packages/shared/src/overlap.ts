/** Where does the group overlap? Pure functions, used by the API (and anything else that holds raw preferences). */
import { dateRange } from './format'
import type { Count, Interest, OverlapSummary, Preferences, Style, Tag } from './types'

const median = (xs: number[]) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

const countBy = <T extends string>(lists: T[][]): Count<T>[] => {
  const c = new Map<T, number>()
  lists.flat().forEach((x) => c.set(x, (c.get(x) ?? 0) + 1))
  return [...c.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)
}

export function computeOverlap(
  prefs: Preferences[],
  window: { windowStart: string; windowEnd: string; days: number },
): OverlapSummary {
  const windowDates = dateRange(window.windowStart, window.windowEnd)
  const dateCounts = windowDates.map((d) => ({ date: d, count: prefs.filter((p) => p.dates.includes(d)).length }))

  // Best run of `days` consecutive dates: the one where the most people are free for every day.
  const len = Math.min(window.days, windowDates.length)
  let best: OverlapSummary['best'] = null
  for (let i = 0; i + len <= windowDates.length; i++) {
    const run = windowDates.slice(i, i + len)
    const free = prefs.filter((p) => run.every((d) => p.dates.includes(d))).length
    if (!best || free > best.free) best = { dates: run, free }
  }

  const budgets = prefs.map((p) => p.budget)
  const styles = countBy<Style>(prefs.map((p) => [p.style]))
  return {
    respondedCount: prefs.length,
    windowDates,
    dateCounts,
    best,
    budget: {
      min: budgets.length ? Math.min(...budgets) : 0,
      max: budgets.length ? Math.max(...budgets) : 0,
      median: median(budgets),
    },
    interests: countBy<Interest>(prefs.map((p) => p.interests)),
    styles,
    food: countBy<string>(prefs.map((p) => p.food)),
    dominantStyle: styles[0]?.key ?? null,
  }
}

/** Weight of each tag for this group: interests count once, styles twice. */
export function tagWeights(ov: OverlapSummary): Partial<Record<Tag, number>> {
  const w: Partial<Record<Tag, number>> = {}
  ov.interests.forEach((i) => (w[i.key] = (w[i.key] ?? 0) + i.count))
  ov.styles.forEach((s) => (w[s.key] = (w[s.key] ?? 0) + s.count * 2))
  return w
}
