import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  /** a line under the title */
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

/**
 * Side drawer — the Modal's sibling for "details beside the page" (the holiday calendar's day
 * view). Slides in from the right, full width on a phone; Esc / backdrop close it and focus goes
 * back to what opened it.
 */
export function Drawer({ open, onClose, title, subtitle, children, footer, className }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      opener?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-[#08120b]/30" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={cn(
          'animate-fade-up relative flex h-full w-full flex-col bg-surface shadow-[var(--shadow-4)] focus:outline-none sm:max-w-md',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="text-lg font-semibold text-text-heading">{title}</h2>}
            {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-text-muted hover:bg-surface-hover hover:text-text"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
