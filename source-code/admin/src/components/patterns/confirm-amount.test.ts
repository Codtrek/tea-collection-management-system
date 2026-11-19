import { describe, expect, it } from 'vitest'
import { amountMatches, CONFIRM_PLACEHOLDER } from './confirm-amount'

describe('HighStakesConfirmFlow re-type gate', () => {
  it('the placeholder is never the amount', () => {
    expect(CONFIRM_PLACEHOLDER).toBe('Type the amount')
    expect(CONFIRM_PLACEHOLDER).not.toMatch(/\d/)
  })

  it('stays locked until the exact amount is typed', () => {
    expect(amountMatches('', 36507.5)).toBe(false)
    expect(amountMatches('36507', 36507.5)).toBe(false)
    expect(amountMatches('36508', 36507.5)).toBe(false)
    expect(amountMatches('36507.5', 36507.5)).toBe(true)
    expect(amountMatches('36,507.50', 36507.5)).toBe(true)
    expect(amountMatches('Rs. 36,507.50', 36507.5)).toBe(true)
  })

  it('whole amounts can be typed without cents; junk never matches', () => {
    expect(amountMatches('1245600', 1245600)).toBe(true)
    expect(amountMatches('1,245,600.00', 1245600)).toBe(true)
    expect(amountMatches('1245600abc', 1245600)).toBe(false)
    expect(amountMatches('-1245600', 1245600)).toBe(false)
  })
})
