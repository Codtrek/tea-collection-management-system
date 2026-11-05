import { describe, expect, it } from 'vitest'
import { comboboxKey, filterOptions } from '@/components/ui/combobox-logic'
import { estateOptionMeta, estateSearchText } from './estate-picker'

const estates = [
  { id: 'EST-0001', estateName: 'Green Valley Estate', ownerName: 'K. Perera', route: 'Route 3', status: 'Active' },
  { id: 'EST-0002', estateName: 'Hilltop Estate', ownerName: 'M. Dissanayake', route: 'Route 5', status: 'Active' },
  { id: 'EST-0003', estateName: 'Mount Rest Estate', ownerName: 'P. Jayasuriya', route: 'Route 2', status: 'Active' },
  { id: 'EST-0005', estateName: 'Riverside Estate', ownerName: 'S. Silva', route: 'Route 2', status: 'Inactive' },
  { id: 'EST-0004', estateName: 'Silver Peak Estate', ownerName: 'R. Fernando', route: 'Route 3', status: 'Active' },
  ...Array.from({ length: 70 }, (_, i) => ({
    id: `EST-${String(100 + i).padStart(4, '0')}`,
    estateName: `Estate ${String(i).padStart(2, '0')}`,
    ownerName: `Owner ${i}`,
    route: `Route ${i % 9}`,
    status: 'Active',
  })),
]
const find = (q: string) => filterOptions(estates, q, estateSearchText).map((e) => e.id)

describe('estate owner picker', () => {
  it('an empty query lists every owner — inactive ones too, nothing capped', () => {
    expect(find('')).toHaveLength(75)
    expect(find('')).toContain('EST-0005')
  })

  it('finds by estate name, owner, EST- ID or route — anywhere, any case', () => {
    expect(find('valley')).toEqual(['EST-0001'])
    expect(find('dissan')).toEqual(['EST-0002'])
    expect(find('est-0003')).toEqual(['EST-0003'])
    expect(find('route 2')).toEqual(expect.arrayContaining(['EST-0003', 'EST-0005']))
    expect(find('RIVERSIDE')).toEqual(['EST-0005'])
  })

  it('each option shows owner · EST-ID · Route under the estate name', () => {
    expect(estateOptionMeta(estates[0])).toBe('K. Perera · EST-0001 · Route 3')
    expect(estateOptionMeta({ ...estates[0], route: '' })).toBe('K. Perera · EST-0001 · No route')
  })

  it('the keyboard skips an inactive estate and Enter never picks one', () => {
    const disabled = (i: number) => estates[i].status !== 'Active'
    // from Mount Rest (2), ArrowDown jumps over Riverside (3) to Silver Peak (4)
    expect(comboboxKey({ open: true, active: 2 }, 'ArrowDown', 5, disabled).active).toBe(4)
    expect(comboboxKey({ open: true, active: 4 }, 'ArrowUp', 5, disabled).active).toBe(2)
    expect(comboboxKey({ open: true, active: 3 }, 'Enter', 5, disabled).select).toBeUndefined()
    expect(comboboxKey({ open: true, active: 0 }, 'ArrowDown', 1, () => true).active).toBe(-1)
  })
})
