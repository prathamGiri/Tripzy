import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

const ToastCtx = createContext<(msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<number>()
  const show = useCallback((m: string) => {
    setMsg(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 2600)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4">
          <div key={msg} className="animate-fade-up rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lift">
            {msg}
          </div>
        </div>
      )}
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

/**
 * Wraps an async action: shows the error as a toast instead of throwing, and tracks a busy flag.
 * Usage: const [run, busy] = useAction(); run(() => savePrefs(p))
 */
export function useAction() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      setBusy(true)
      try {
        return await fn()
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Something went wrong')
        return undefined
      } finally {
        setBusy(false)
      }
    },
    [toast],
  )
  return [run, busy] as const
}
