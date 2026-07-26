import type { Settlement } from './types'

/*
  Payment math — moved out of the old fixture (`data.ts`, now removed) now
  that settlement records come from the real backend with the same
  denormalized snapshot fields (EST-07/08).
*/
export function grossRevenue(s: Settlement): number {
  return s.superKg * s.superRate + s.normalKg * s.normalRate
}

export function netPayable(s: Settlement): number {
  return grossRevenue(s) - s.transportCost - s.fertilizerDeduction - s.advanceDeduction
}
