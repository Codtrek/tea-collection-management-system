import { describe, expect, it } from 'vitest'
import { niceTicks } from './ticks'

describe('niceTicks', () => {
  it('round steps from 0 that cover the maximum', () => {
    expect(niceTicks(376)).toEqual([0, 100, 200, 300, 400])
    expect(niceTicks(314.2)).toEqual([0, 100, 200, 300, 400])
    expect(niceTicks(1000)).toEqual([0, 250, 500, 750, 1000])
    expect(niceTicks(9)).toEqual([0, 2.5, 5, 7.5, 10])
  })
  it('an empty chart still has an axis', () => {
    expect(niceTicks(0)).toEqual([0, 1])
  })
})
