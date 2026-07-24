import type { PayrollRow } from './types'

export const PAYROLL = [
  { id: 'PR-0001', employeeId: 'EMP-0001', employeeName: 'K. Perera', period: 'July 2026', gross: 85000, deductions: { advances: 20000, other: 4200 }, status: 'Pending' },
  { id: 'PR-0002', employeeId: 'EMP-0002', employeeName: 'N. Silva', period: 'July 2026', gross: 62000, deductions: { advances: 0, other: 3100 }, status: 'Pending' },
  { id: 'PR-0003', employeeId: 'EMP-0003', employeeName: 'S. Fernando', period: 'July 2026', gross: 85000, deductions: { advances: 15000, other: 4200 }, status: 'Pending' },
  { id: 'PR-0004', employeeId: 'EMP-0004', employeeName: 'T. Rajapaksa', period: 'July 2026', gross: 48000, deductions: { advances: 0, other: 2400 }, status: 'Pending', missingBank: true },
  { id: 'PR-0005', employeeId: 'EMP-0005', employeeName: 'M. Gunawardena', period: 'July 2026', gross: 120000, deductions: { advances: 0, other: 6000 }, status: 'Pending' },
]

export function netPay(row: PayrollRow): number {
  return row.gross - (row.deductions.advances + row.deductions.other)
}