import { useEffect, useRef, useState } from 'react'

/* Counts up to `target` over ~800ms on first mount only (foundations §8).
   Honors prefers-reduced-motion by rendering the final value instantly. */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useCountUp(target: number, duration = 800): number {
  // Reduced-motion users render the final value immediately (no animation, no effect setState).
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))
  const started = useRef(false)

  useEffect(() => {
    if (started.current || prefersReducedMotion()) return
    started.current = true

    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}
