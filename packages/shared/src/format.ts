const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const dateRange = (start: string, end: string) => {
  const out: string[] = []
  const d = parseDate(start)
  const e = parseDate(end)
  while (d <= e && out.length < 62) {
    out.push(toISO(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

export const dayName = (s: string) => DAYS[parseDate(s).getDay()]
export const dayNum = (s: string) => parseDate(s).getDate()
export const monthName = (s: string) => MONTHS[parseDate(s).getMonth()]
export const fmtDate = (s: string) => `${dayName(s)} ${dayNum(s)} ${monthName(s)}`

export const fmtRange = (a: string, b: string) => {
  if (!a || !b) return ''
  if (monthName(a) === monthName(b)) return `${dayNum(a)}–${dayNum(b)} ${monthName(b)}`
  return `${dayNum(a)} ${monthName(a)} – ${dayNum(b)} ${monthName(b)}`
}

export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

export const fmtMins = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`)
