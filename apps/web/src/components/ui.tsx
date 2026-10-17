import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Minus, Plus, X } from 'lucide-react'
type Member = { id?: string; name: string; color: string }

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export { cx }

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark' | 'sea'
  size?: 'sm' | 'md' | 'lg'
  full?: boolean
}

export function Button({ variant = 'primary', size = 'md', full, className, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none',
        size === 'sm' && 'px-3 py-2 text-sm',
        size === 'md' && 'px-4 py-3 text-[15px]',
        size === 'lg' && 'px-6 py-4 text-base',
        variant === 'primary' && 'bg-brand-500 text-white shadow-[0_8px_20px_-6px_rgba(249,93,54,.6)] hover:bg-brand-600',
        variant === 'sea' && 'bg-sea-600 text-white shadow-[0_8px_20px_-6px_rgba(1,158,143,.55)] hover:bg-sea-700',
        variant === 'dark' && 'bg-slate-900 text-white hover:bg-slate-800',
        variant === 'secondary' && 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50',
        variant === 'ghost' && 'text-slate-600 hover:bg-slate-100',
        full && 'w-full',
        className,
      )}
    />
  )
}

export function Chip({
  selected, onClick, children, className,
}: { selected?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-95',
        selected
          ? 'bg-brand-500 text-white shadow-[0_4px_12px_-4px_rgba(249,93,54,.6)]'
          : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-900/5', className)}>{children}</div>
}

export function Avatar({ member, size = 36, ring }: { member: Pick<Member, 'name' | 'color'>; size?: number; ring?: boolean }) {
  return (
    <div
      className={cx(
        'grid shrink-0 place-items-center rounded-full font-bold text-white',
        member.color,
        ring && 'ring-2 ring-white',
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={member.name}
    >
      {member.name.slice(0, 1).toUpperCase()}
    </div>
  )
}

export function AvatarStack({ members, size = 28, max = 5 }: { members: Member[]; size?: number; max?: number }) {
  return (
    <div className="flex -space-x-2">
      {members.slice(0, max).map((m, i) => (
        <Avatar key={m.id ?? i} member={m} size={size} ring />
      ))}
      {members.length > max && (
        <div className="grid place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 ring-2 ring-white" style={{ width: size, height: size }}>
          +{members.length - max}
        </div>
      )}
    </div>
  )
}

export function Stepper({
  value, min, max, onChange, suffix,
}: { value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700 transition active:scale-90 disabled:opacity-30"
      >
        <Minus size={18} />
      </button>
      <div className="min-w-[72px] text-center text-lg font-bold tabular-nums">
        {value}
        {suffix && <span className="ml-1 text-sm font-medium text-slate-500">{suffix}</span>}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700 transition active:scale-90 disabled:opacity-30"
      >
        <Plus size={18} />
      </button>
    </div>
  )
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-slate-200', className)}>
      <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  )
}

export function PageHeader({ title, sub, back, right }: { title?: ReactNode; sub?: ReactNode; back?: string | true; right?: ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="flex items-center gap-2 px-4 pb-2 pt-3">
      {back && (
        <button
          onClick={() => (back === true ? nav(-1) : nav(back))}
          className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-slate-700 hover:bg-slate-100"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        {title && <div className="truncate text-[17px] font-bold">{title}</div>}
        {sub && <div className="truncate text-xs text-slate-500">{sub}</div>}
      </div>
      {right}
    </div>
  )
}

export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 bg-gradient-to-t from-slate-50 via-slate-50 to-slate-50/0 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-6">
      {children}
    </div>
  )
}

export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative max-h-[85dvh] w-full max-w-md animate-sheet-up overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-lift sm:rounded-3xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-lg font-bold">{title}</div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <div className={cx('flex items-center gap-1.5 text-xl font-extrabold tracking-tight', light ? 'text-white' : 'text-slate-900')}>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-base shadow-sm">🌴</span>
      tripzy
    </div>
  )
}
