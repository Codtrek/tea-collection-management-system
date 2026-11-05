import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Leaf } from 'lucide-react'
import type { TimelineEntry } from './types'

/*
  Addendum §6.4 — the signature element. Spend boldness here, nowhere else on
  the page (§6.4 restraint check: this is the only ornamented element in the
  whole Lifetime History feature).

  A single continuous vertical gradient rail runs the left edge of the feed,
  oldest at the bottom (dark #0D2E19, the roots) flowing to newest at the top
  (bright Harboost #53CF81, current growth) — literally true to the subject: a
  tea delivery has a real chain of custody, and a multi-year estate
  relationship has a real, continuous span. Reuses the Provenance Trail
  thesis from visual-foundations §10 (COL-03's photo-evidence trail) applied
  to a lifetime instead of a single delivery.

  Node per entry type: Delivery = filled leaf glyph (a leaf reaching the
  factory — tea-vertical expression, brand doc §3). Settlement = filled ring
  (money closing a period). Fertilizer/Advance/Account = small dot.
  Registered = hollow origin marker, always the bottom-most node.
*/

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Node({ type }: { type: TimelineEntry['type'] }) {
  if (type === 'Delivery') {
    return (
      <span className="flex size-6 items-center justify-center rounded-full bg-brand text-white shadow-[var(--shadow-1)]">
        <Leaf className="size-3.5" aria-hidden />
      </span>
    )
  }
  if (type === 'Settlement') {
    return <span className="size-4 rounded-full border-[3px] border-primary bg-surface" aria-hidden />
  }
  if (type === 'Registered') {
    return <span className="size-5 rounded-full border-2 border-dashed border-text-muted bg-surface" aria-hidden />
  }
  // Fertilizer / Advance / Account — small dot.
  return <span className="size-2.5 rounded-full bg-text-muted" aria-hidden />
}

export interface TenureRibbonRowProps {
  entry: TimelineEntry
  children: ReactNode
}

/**
 * One timeline row: node column (on the ribbon) + content column. Renders as
 * a plain `<li>` — the ribbon bar itself is a single sibling element drawn
 * behind every row (see `TenureRibbon` below), not per-row.
 */
export function TenureRibbonRow({ entry, children }: TenureRibbonRowProps) {
  return (
    <li className="relative flex gap-4 py-3">
      <div className="relative z-10 flex w-6 shrink-0 justify-center pt-0.5">
        <Node type={entry.type} />
      </div>
      <div className="min-w-0 flex-1 pb-1">{children}</div>
    </li>
  )
}

/**
 * Wraps a list of `TenureRibbonRow`s with the gradient rail. Draws once on
 * first mount only (§6.5) — never re-triggers on filter change or
 * pagination, guarded by a ref so React StrictMode's double-invoke mount
 * doesn't restart it. `prefers-reduced-motion` renders it already drawn (the
 * global CSS rule collapses the animation duration to ~0).
 */
export function TenureRibbon({ children }: { children: ReactNode }) {
  const [animate, setAnimate] = useState(false)
  const hasDrawn = useRef(false)

  useEffect(() => {
    if (hasDrawn.current || prefersReducedMotion()) return
    hasDrawn.current = true
    setAnimate(true)
  }, [])

  return (
    <div className="relative">
      <div
        className={animate ? 'absolute inset-y-2 left-[11px] w-[3px] rounded-full animate-ribbon-grow' : 'absolute inset-y-2 left-[11px] w-[3px] rounded-full'}
        style={{ backgroundImage: 'var(--gradient-hero)' }}
        aria-hidden
      />
      <ul className="relative flex flex-col">{children}</ul>
    </div>
  )
}
