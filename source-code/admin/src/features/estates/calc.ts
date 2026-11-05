import type { Settlement } from './types'

/*
  Payment math — moved out of the old fixture (`data.ts`, now removed) now
  that settlement records come from the real backend with the same
  denormalized snapshot fields (EST-07/08).
*/
/** Gross leaf value: what the generator priced (rate periods), or kg × rate on a seeded row. */
export function grossRevenue(s: Settlement): number {
  return s.grossAmount ?? s.superKg * s.superRate + s.normalKg * s.normalRate
}

export function netPayable(s: Settlement): number {
  // `adjustment` is signed: a grading correction on an already-paid delivery is carried into the
  // NEXT settlement (never rewriting the one that was paid).
  return grossRevenue(s) - s.transportCost - s.fertilizerDeduction - s.advanceDeduction + s.adjustment
}
