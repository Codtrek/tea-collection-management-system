import { describe, expect, it } from 'vitest'
import { hasPayrollFilters, payrollParams, payrollQuery, readPayrollFilters } from './payroll-filters'

const NOW = '2026-11'
const read = (qs: string) => readPayrollFilters(new URLSearchParams(qs), NOW)

describe('Payroll filters live in the URL', () => {
  it('opens on the current month — a bare URL — and round-trips every filter', () => {
    expect(read('').month).toBe('2026-11')
    expect(payrollParams(read(''), NOW).toString()).toBe('')
    const qs = 'month=2026-07&q=perera&role=Driver&route=2&status=Pending&issues=noBank%2CzeroGross&method=bank&sort=net&dir=desc&page=1'
    expect(payrollParams(read(qs), NOW).toString()).toBe(qs)
  })

  it('ignores unknown issues and future months', () => {
    expect(read('issues=noBank,bogus').issues).toEqual(['noBank'])
    expect(read('month=2027-02').month).toBe('2026-11')
  })

  it('the "N issues to fix" link is just ?issues=noBank — the same filter', () => {
    const f = read('month=2026-07&issues=noBank')
    expect(payrollQuery(f)).toMatchObject({ month: '2026-07', issues: 'noBank', limit: 25 })
    expect(hasPayrollFilters(f)).toBe(true)
    expect(hasPayrollFilters(read('month=2026-07&sort=net&dir=asc'))).toBe(false)
  })
})
