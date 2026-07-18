import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/cn'

type ToastTone = 'success' | 'warning' | 'danger'
interface Toast {
  id: number
  tone: ToastTone
  message: string
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const toneStyles: Record<ToastTone, { cls: string; icon: ReactNode }> = {
  success: { cls: 'bg-success-bg text-success-fg', icon: <CheckCircle2 className="size-4" /> },
  warning: { cls: 'bg-warning-bg text-warning-fg', icon: <AlertTriangle className="size-4" /> },
  danger: { cls: 'bg-danger-bg text-danger-fg', icon: <XCircle className="size-4" /> },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), tone, message }])
  }, [])

  const remove = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => remove(t.id)} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const style = toneStyles[toast.tone]
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div
      role="status"
      className={cn(
        'animate-fade-up flex items-center gap-2.5 rounded-[var(--radius-md)] bg-surface p-3 shadow-[var(--shadow-3)]',
      )}
    >
      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', style.cls)}>
        {style.icon}
      </span>
      <p className="flex-1 text-sm text-text">{toast.message}</p>
      <button onClick={onDismiss} aria-label="Dismiss" className="text-text-muted hover:text-text">
        <X className="size-4" />
      </button>
    </div>
  )
}
