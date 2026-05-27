import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'warning' | 'error' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  action?: { label: string; onClick: () => void }
  duration?: number
}

const icons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
}

const colors = {
  success: 'border-l-emerald-500 bg-emerald-50 text-emerald-800',
  warning: 'border-l-amber-500 bg-amber-50 text-amber-800',
  error: 'border-l-red-500 bg-red-50 text-red-800',
  info: 'border-l-blue-500 bg-blue-50 text-blue-800',
}

const iconColors = {
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
  info: 'text-blue-500',
}

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const Icon = icons[toast.type]

  useEffect(() => {
    const duration = toast.duration ?? 4000
    const t = setTimeout(() => onDismiss(toast.id), duration)
    return () => clearTimeout(t)
  }, [toast, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl border-l-4 shadow-lg max-w-[340px] w-full',
        colors[toast.type],
      )}
    >
      <Icon size={16} className={cn('mt-0.5 flex-shrink-0', iconColors[toast.type])} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium leading-snug">{toast.message}</p>
        {toast.action && (
          <button
            onClick={() => { toast.action!.onClick(); onDismiss(toast.id) }}
            className="text-[12px] font-semibold underline mt-1 opacity-80 hover:opacity-100"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

// ── Global toast store ────────────────────────────────────────────────────────

type ToastListener = (toasts: ToastItem[]) => void
let _toasts: ToastItem[] = []
const _listeners = new Set<ToastListener>()

function notify() {
  _listeners.forEach((fn) => fn([..._toasts]))
}

export const toast = {
  show(msg: string, type: ToastType = 'info', opts?: Partial<Pick<ToastItem, 'action' | 'duration'>>) {
    const id = Math.random().toString(36).slice(2)
    _toasts = [..._toasts, { id, type, message: msg, ...opts }]
    notify()
    return id
  },
  success(msg: string, opts?: Partial<Pick<ToastItem, 'action' | 'duration'>>) {
    return this.show(msg, 'success', opts)
  },
  error(msg: string, opts?: Partial<Pick<ToastItem, 'action' | 'duration'>>) {
    return this.show(msg, 'error', { duration: 6000, ...opts })
  },
  warning(msg: string, opts?: Partial<Pick<ToastItem, 'action' | 'duration'>>) {
    return this.show(msg, 'warning', opts)
  },
  dismiss(id: string) {
    _toasts = _toasts.filter((t) => t.id !== id)
    notify()
  },
}

// ── ToastContainer — mount once in AppShell ──────────────────────────────────

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    _listeners.add(setToasts)
    return () => { _listeners.delete(setToasts) }
  }, [])

  const dismiss = useCallback((id: string) => {
    _toasts = _toasts.filter((t) => t.id !== id)
    notify()
  }, [])

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastMessage toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
