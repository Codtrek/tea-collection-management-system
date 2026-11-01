import { describe, expect, it } from 'vitest'
import { activeNavTo } from './nav-match'
import { NAV_GROUPS } from './nav'

const tos = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.to))

describe('activeNavTo', () => {
  it.each([
    ['/estates/advances', '/estates/advances'],
    ['/estates/advances/new', '/estates/advances'],
    ['/estates/advances/EADV-2026-0031', '/estates/advances'],
    ['/estates/settlements/SET-2026-07-001', '/estates/settlements'],
    ['/estates', '/estates'],
    ['/estates/12', '/estates'],
    ['/collections', '/collections'],
    ['/collections/COL-1', '/collections'],
    ['/collections/dispatch', '/collections/dispatch'],
    ['/employees/EMP-1', '/employees'],
    ['/employees/advances', '/employees/advances'],
    ['/employees/payroll/process', '/employees/payroll'],
    ['/fertilizer/requests/FR-1', '/fertilizer/requests'],
    ['/fertilizer/BATCH-1', '/fertilizer'],
  ])('%s → %s', (path, expected) => {
    expect(activeNavTo(path, tos)).toBe(expected)
  })

  it('never matches a mere prefix of a segment', () => {
    expect(activeNavTo('/estatesX', ['/estates'])).toBeNull()
  })
})
