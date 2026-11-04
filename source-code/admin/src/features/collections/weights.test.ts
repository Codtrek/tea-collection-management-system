import { describe, expect, it } from 'vitest'
import { parseWeight } from './weights'
import { netPayable } from '../estates/calc'
import type { Settlement } from '../estates/types'

describe('parseWeight — what the grading dialog lets through', () => {
  it('blank means "no line for this grade"', () => {
    expect(parseWeight('')).toEqual({ kg: null })
    expect(parseWeight('   ')).toEqual({ kg: null })
  })

  it('accepts a positive number with up to 2 decimals', () => {
    expect(parseWeight('32')).toEqual({ kg: 32 })
    expect(parseWeight('12.5')).toEqual({ kg: 12.5 })
    expect(parseWeight(' 0.25 ')).toEqual({ kg: 0.25 })
  })

  it('BLOCKS zero, negative and non-numeric input instead of dropping it', () => {
    for (const bad of ['0', '0.00', '-5', '-0.5', 'abc', '12kg', '1,5', '1e3', '.']) {
      const r = parseWeight(bad)
      expect(r.kg, bad).toBeNull()
      expect(r.error, bad).toBeTruthy()
    }
  })

  it('blocks more than 2 decimal places', () => {
    expect(parseWeight('1.234').error).toMatch(/2 decimal/)
  })
})

describe('netPayable carries a signed grading adjustment', () => {
  const base = {
    superKg: 100,
    normalKg: 50,
    superRate: 185,
    normalRate: 95,
    transportCost: 1000,
    fertilizerDeduction: 2000,
    advanceDeduction: 3000,
  } as Settlement

  it('is unchanged without one', () => {
    expect(netPayable({ ...base, adjustment: 0 })).toBe(100 * 185 + 50 * 95 - 6000)
  })

  it('adds a positive and subtracts a negative adjustment', () => {
    expect(netPayable({ ...base, adjustment: 1800 })).toBe(100 * 185 + 50 * 95 - 6000 + 1800)
    expect(netPayable({ ...base, adjustment: -700 })).toBe(100 * 185 + 50 * 95 - 6000 - 700)
  })
})
