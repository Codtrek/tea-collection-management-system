import type { PayrollRow } from './types'

export function netPay(row: PayrollRow): number {
  return row.gross - row.deductions.advances - row.deductions.other
}
