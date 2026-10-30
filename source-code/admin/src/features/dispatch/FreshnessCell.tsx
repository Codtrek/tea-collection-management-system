import { tokenColor, FRESHNESS_TOKEN, freshnessLabel } from './status'
import type { BoardAgent } from './types'

/*
  "How old is the last fix" — never "live". A coloured dot (green < 5 min · amber 5–30 min ·
  grey beyond) always sits beside its text, so the state isn't conveyed by colour alone.
*/
export function FreshnessCell({ agent }: { agent: Pick<BoardAgent, 'freshness' | 'ageMin' | 'lastSeen'> }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-text">
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: tokenColor(FRESHNESS_TOKEN[agent.freshness]) }}
      />
      {freshnessLabel(agent)}
    </span>
  )
}
