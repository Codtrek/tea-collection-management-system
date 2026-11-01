import type { PayrollMonthQuery } from '@/services/employees'
import { readMonth } from '@/lib/month'
import type { PayrollIssue } from './types'

/*
  Payroll by month, Part C (Payroll-Month-History-Addendum) — the month and every filter live in
  the URL, like the month picker. Pure; tested in payroll-filters.test.ts.
*/

export const PAYROLL_ISSUE_OPTIONS: { value: PayrollIssue; label: string }[] = [
  { value: 'noBank', label: 'No bank details' },
  { value: 'zeroGross', label: 'Rs. 0 gross' },
  { value: 'hasDeductions', label: 'Has deductions' },
  { value: 'hasAdvance', label: 'Has advance recovery' },
]

export interface PayrollFilters {
  month: string
  search: string
  role: string
  route: string
  status: string
  /** any of these */
  issues: PayrollIssue[]
  method: string
  sort: string
  dir: '' | 'asc' | 'desc'
  page: number
}

const ISSUES = PAYROLL_ISSUE_OPTIONS.map((o) => o.value)

export function readPayrollFilters(p: URLSearchParams, current: string): PayrollFilters {
  const dir = p.get('dir')
  return {
    month: readMonth(p.get('month'), current),
    search: p.get('q') ?? '',
    role: p.get('role') ?? '',
    route: p.get('route') ?? '',
    status: p.get('status') ?? '',
    issues: (p.get('issues') ?? '').split(',').filter((i): i is PayrollIssue => ISSUES.includes(i as PayrollIssue)),
    method: p.get('method') ?? '',
    sort: p.get('sort') ?? '',
    dir: dir === 'asc' || dir === 'desc' ? dir : '',
    page: Math.max(0, Number(p.get('page')) || 0),
  }
}

/** Only non-default values go in the URL; the current month is a bare `/employees/payroll`. */
export function payrollParams(f: PayrollFilters, current: string): URLSearchParams {
  const p = new URLSearchParams()
  if (f.month !== current) p.set('month', f.month)
  if (f.search) p.set('q', f.search)
  if (f.role) p.set('role', f.role)
  if (f.route) p.set('route', f.route)
  if (f.status) p.set('status', f.status)
  if (f.issues.length) p.set('issues', f.issues.join(','))
  if (f.method) p.set('method', f.method)
  if (f.sort && f.dir) {
    p.set('sort', f.sort)
    p.set('dir', f.dir)
  }
  if (f.page > 0) p.set('page', String(f.page))
  return p
}

export const PAYROLL_PAGE_SIZE = 25

export function payrollQuery(f: PayrollFilters): PayrollMonthQuery {
  return {
    month: f.month,
    search: f.search || undefined,
    role: f.role || undefined,
    routeId: f.route ? Number(f.route) : undefined,
    status: f.status || undefined,
    issues: f.issues.length ? f.issues.join(',') : undefined,
    method: f.method || undefined,
    sort: f.sort && f.dir ? f.sort : undefined,
    dir: f.sort && f.dir ? f.dir : undefined,
    page: f.page,
    limit: PAYROLL_PAGE_SIZE,
  }
}

/** Any filter beyond the month — the summary then says "Showing X of Y". */
export function hasPayrollFilters(f: PayrollFilters): boolean {
  return !!(f.search || f.role || f.route || f.status || f.issues.length || f.method)
}
