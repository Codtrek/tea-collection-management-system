/*
  The searchable picker's behaviour (components/ui/Combobox) — filtering and the keyboard — as
  pure functions, so they're unit-tested without a browser (combobox-logic.test.ts).
*/

/** Case-insensitive, matching anywhere: "pere" finds "K. Perera" and "N. Perera". Empty = everything. */
export function filterOptions<T>(items: T[], query: string, textOf: (item: T) => string): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => textOf(item).toLowerCase().includes(q))
}

export interface ComboboxState {
  open: boolean
  /** highlighted option, -1 for none */
  active: number
}

export type ComboboxKeyResult = ComboboxState & {
  /** select the option at `active` */
  select?: boolean
  /** the key was handled — prevent the browser's default (e.g. caret moves) */
  handled: boolean
}

/**
 * ArrowDown / ArrowUp move through the `count` visible options (and open the list), wrapping at
 * the ends; Enter selects the highlighted one; Escape closes. Anything else is left to the input.
 */
export function comboboxKey(state: ComboboxState, key: string, count: number): ComboboxKeyResult {
  switch (key) {
    case 'ArrowDown':
      if (!state.open) return { open: true, active: count > 0 ? 0 : -1, handled: true }
      return { open: true, active: count === 0 ? -1 : (state.active + 1) % count, handled: true }
    case 'ArrowUp':
      if (!state.open) return { open: true, active: count - 1, handled: true }
      return { open: true, active: count === 0 ? -1 : state.active <= 0 ? count - 1 : state.active - 1, handled: true }
    case 'Enter':
      if (state.open && state.active >= 0 && state.active < count) return { open: false, active: -1, select: true, handled: true }
      return { ...state, handled: state.open }
    case 'Escape':
      return { open: false, active: -1, handled: state.open }
    default:
      return { ...state, handled: false }
  }
}
