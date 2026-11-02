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

/** The next enabled option from `from`, stepping `dir` (wrapping); -1 when none is enabled. */
function step(from: number, dir: 1 | -1, count: number, disabled: (i: number) => boolean): number {
  for (let n = 1; n <= count; n++) {
    const i = (((from + dir * n) % count) + count) % count
    if (!disabled(i)) return i
  }
  return -1
}

/**
 * ArrowDown / ArrowUp move through the `count` visible options (and open the list), wrapping at
 * the ends and skipping `disabled` ones (e.g. an inactive estate); Enter selects the highlighted
 * one — never a disabled one; Escape closes. Anything else is left to the input.
 */
export function comboboxKey(
  state: ComboboxState,
  key: string,
  count: number,
  disabled: (index: number) => boolean = () => false,
): ComboboxKeyResult {
  switch (key) {
    case 'ArrowDown':
      if (count === 0) return { open: true, active: -1, handled: true }
      return { open: true, active: step(state.open ? state.active : -1, 1, count, disabled), handled: true }
    case 'ArrowUp':
      if (count === 0) return { open: true, active: -1, handled: true }
      return { open: true, active: step(state.open && state.active >= 0 ? state.active : 0, -1, count, disabled), handled: true }
    case 'Enter':
      if (state.open && state.active >= 0 && state.active < count && !disabled(state.active)) {
        return { open: false, active: -1, select: true, handled: true }
      }
      return { ...state, handled: state.open }
    case 'Escape':
      return { open: false, active: -1, handled: state.open }
    default:
      return { ...state, handled: false }
  }
}
