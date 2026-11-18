/*
  The re-type gate of HighStakesConfirmFlow, kept pure so the rule is unit-tested
  (confirm-amount.test.ts). The input starts EMPTY with a neutral placeholder — showing the number
  there would let anyone "re-type" it without reading it.
*/
export const CONFIRM_PLACEHOLDER = 'Type the amount'

const round2 = (n: number) => Math.round(n * 100) / 100

/** Whether what was typed is the amount: commas, spaces and "Rs." are ignored; cents must agree. */
export function amountMatches(typed: string, amount: number): boolean {
  const cleaned = typed.replace(/rs\.?/i, '').replace(/[,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return false
  return round2(Number(cleaned)) === round2(amount)
}
