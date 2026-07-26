import { useEffect, useState } from 'react'

/* Counts up to `target` over ~800ms, re-running whenever `target` changes.
   No one-shot ref guard, so a first rAF cancelled by StrictMode's mount-time
   effect double-invoke is always rescheduled. Honors prefers-reduced-motion by
   resolving to the final value on the first frame. */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))

  useEffect(() => {
    const reduce = prefersReducedMotion()
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = reduce ? 1 : Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(p < 1 ? target * eased : target) // land exactly on target
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}
