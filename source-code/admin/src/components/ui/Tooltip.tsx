import { useEffect, useId, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

export interface TooltipProps {
  /** the tooltip text */
  content: ReactNode
  /** the element it describes — it receives focus (a button or a tabIndex=0 span) */
  children: (props: {
    'aria-describedby': string | undefined
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void
    onMouseLeave: () => void
    onFocus: (e: React.FocusEvent<HTMLElement>) => void
    onBlur: () => void
  }) => ReactNode
  className?: string
}

interface Spot {
  left: number
  top: number
  below: boolean
}

/*
  Accessible tooltip: opens on hover AND keyboard focus, closes on Esc / blur / leave, and is
  wired with aria-describedby so a screen reader reads it with the control. Rendered in a portal
  with fixed positioning, so a scrolling table (sticky matrix) never clips it.
*/
export function Tooltip({ content, children, className }: TooltipProps) {
  const id = useId()
  const [spot, setSpot] = useState<Spot | null>(null)

  const openAt = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const below = r.top < 96
    setSpot({ left: r.left + r.width / 2, top: below ? r.bottom + 8 : r.top - 8, below })
  }
  const close = () => setSpot(null)

  useEffect(() => {
    if (!spot) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSpot(null)
    }
    const onScroll = () => setSpot(null)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [spot])

  return (
    <>
      {children({
        'aria-describedby': id,
        onMouseEnter: (e) => openAt(e.currentTarget),
        onMouseLeave: close,
        onFocus: (e) => openAt(e.currentTarget),
        onBlur: close,
      })}
      {/* exactly one element holds the id: the popup while open, a hidden copy while closed */}
      {!spot && (
        <span id={id} className="sr-only">
          {content}
        </span>
      )}
      {spot &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{
              left: Math.min(Math.max(spot.left, 160), window.innerWidth - 160),
              top: spot.top,
            }}
            className={cn(
              'pointer-events-none fixed z-[60] w-max max-w-[300px] -translate-x-1/2 rounded-[var(--radius-md)] bg-text-heading px-3 py-2 text-xs leading-5 text-surface shadow-[var(--shadow-3)]',
              spot.below ? '' : '-translate-y-full',
              className,
            )}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  )
}
