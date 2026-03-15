import { useState, useEffect, useCallback, createContext, useContext, type FC, type ReactNode } from 'react'

// ── Types ────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration: number
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

// ── Context ──────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | null>(null)

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ── Single Toast ─────────────────────────────────────────────────

const ToastNotification: FC<{
  item: ToastItem
  onDismiss: (id: string) => void
}> = ({ item, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => onDismiss(item.id), 150)
    }, item.duration)
    return () => clearTimeout(timer)
  }, [item.id, item.duration, onDismiss])

  const iconColor =
    item.type === 'success' ? 'text-ds-success' :
    item.type === 'error' ? 'text-ds-error' :
    'text-ds-text-muted'

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 bg-ds-surface border border-ds-border
        font-mono text-xs text-ds-text
        transition-all duration-150 ease-out
        ${isVisible && !isLeaving ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
      style={{ minWidth: 260, maxWidth: 400 }}
    >
      {/* Icon */}
      <span className={`shrink-0 ${iconColor}`}>
        {item.type === 'success' && (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
        {item.type === 'error' && (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        )}
        {item.type === 'info' && (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        )}
      </span>
      <span className="flex-1 leading-snug">{item.message}</span>
      <button
        onClick={() => {
          setIsLeaving(true)
          setTimeout(() => onDismiss(item.id), 150)
        }}
        className="shrink-0 text-ds-text-dim hover:text-ds-text transition-colors p-0.5"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ── Provider ─────────────────────────────────────────────────────

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev.slice(-4), { id, message, type, duration }])
  }, [])

  const value: ToastContextType = {
    toast,
    success: useCallback((msg: string) => toast(msg, 'success'), [toast]),
    error: useCallback((msg: string) => toast(msg, 'error', 5000), [toast]),
    info: useCallback((msg: string) => toast(msg, 'info'), [toast]),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastNotification key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
