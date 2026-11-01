import { describe, expect, it } from 'vitest'
import { comboboxKey, filterOptions } from './combobox-logic'

const people = [
  { name: 'K. Perera', id: 'EMP-0001', role: 'Factory Officer' },
  { name: 'N. Perera', id: 'EMP-0010', role: 'Tea Collecting Agent' },
  { name: 'S. Fernando', id: 'EMP-0003', role: 'Factory Officer' },
]
const text = (p: (typeof people)[number]) => `${p.name} ${p.id} ${p.role}`

describe('Combobox filtering', () => {
  it('matches anywhere, case-insensitive — "pere" finds both Pereras', () => {
    expect(filterOptions(people, 'pere', text).map((p) => p.name)).toEqual(['K. Perera', 'N. Perera'])
    expect(filterOptions(people, 'PERE', text)).toHaveLength(2)
  })

  it('matches the employee ID too', () => {
    expect(filterOptions(people, 'emp-0003', text).map((p) => p.name)).toEqual(['S. Fernando'])
    expect(filterOptions(people, '0010', text).map((p) => p.name)).toEqual(['N. Perera'])
  })

  it('an empty query shows everything; no match is an empty list', () => {
    expect(filterOptions(people, '  ', text)).toHaveLength(3)
    expect(filterOptions(people, 'zzz', text)).toEqual([])
  })
})

describe('Combobox keyboard', () => {
  const closed = { open: false, active: -1 }

  it('ArrowDown opens on the first option, then moves down and wraps', () => {
    const a = comboboxKey(closed, 'ArrowDown', 3)
    expect(a).toMatchObject({ open: true, active: 0, handled: true })
    expect(comboboxKey({ open: true, active: 0 }, 'ArrowDown', 3).active).toBe(1)
    expect(comboboxKey({ open: true, active: 2 }, 'ArrowDown', 3).active).toBe(0)
  })

  it('ArrowUp moves up and wraps to the last', () => {
    expect(comboboxKey({ open: true, active: 0 }, 'ArrowUp', 3).active).toBe(2)
    expect(comboboxKey({ open: true, active: 2 }, 'ArrowUp', 3).active).toBe(1)
    expect(comboboxKey(closed, 'ArrowUp', 3)).toMatchObject({ open: true, active: 2 })
  })

  it('Enter selects the highlighted option and closes; with nothing highlighted it does nothing', () => {
    expect(comboboxKey({ open: true, active: 1 }, 'Enter', 3)).toEqual({ open: false, active: -1, select: true, handled: true })
    expect(comboboxKey({ open: true, active: -1 }, 'Enter', 3).select).toBeUndefined()
    expect(comboboxKey({ open: true, active: 0 }, 'Enter', 0).select).toBeUndefined()
  })

  it('Escape closes; other keys are left to the input', () => {
    expect(comboboxKey({ open: true, active: 1 }, 'Escape', 3)).toEqual({ open: false, active: -1, handled: true })
    expect(comboboxKey({ open: true, active: 1 }, 'a', 3)).toMatchObject({ open: true, active: 1, handled: false })
  })

  it('with no matches the arrows highlight nothing', () => {
    expect(comboboxKey({ open: true, active: -1 }, 'ArrowDown', 0).active).toBe(-1)
  })
})
