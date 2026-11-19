import { tokenColor, FRESHNESS_TOKEN, freshnessLabel, freshnessShort } from './status'
import type { BoardAgent } from './types'

/*
  "How old is the last fix" — never "live". A coloured dot (green < 5 min · amber 5–30 min ·
  grey beyond) always sits beside its text, so the state isn't conveyed by colour alone. One line
  in the table ("11:16", "8 min ago"); the full wording is the tooltip and the screen-reader text.
*/
export function FreshnessCell({ agent }: { agent: Pick<BoardAgent, 'freshness' | 'ageMin' | 'lastSeen'> }) {
  const full = freshnessLabel(agent)
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-text" title={full}>
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: tokenColor(FRESHNESS_TOKEN[agent.freshness]) }}
      />
      <span aria-hidden>{freshnessShort(agent)}</span>
      <span className="sr-only">{full}</span>
    </span>
  )
}
