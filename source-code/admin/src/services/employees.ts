import { apiFetch } from '@/lib/api'
import type { PaginatedResult } from '@/features/estates/types'
import type {
  AgentFertilizerRow,
  AgentHistoryRow,
  Advance,
  AdvanceDetail,
  AdvanceListResult,
  AdvanceTab,
  EmployeeAdvances,
  PayrollMonthResult,
  AttendanceRecord,
  AttendanceStatus,
  Employee,
  EmployeeRoles,
  PayrollRow,
} from '@/features/employees/types'

export interface EmployeeInput {
  name: string
  nic: string
  dob: string
  contact: string
  address: string
  role: string
  department: string
  hireDate: string
  employmentType: Employee['employmentType']
  paymentMethod: Employee['paymentMethod']
  bank: string
  branch: string
  account: string
  hasLogin: boolean
  dayRate?: number
  dayOtRate?: number
  nightRate?: number
  nightOtRate?: number
}

export interface AttendanceRecordInput {
  employeeId: string
  status: AttendanceStatus
  dayHours?: number
  dayOtHours?: number
  nightHours?: number
  nightOtHours?: number
}

export interface MarkAttendanceInput {
  date: string
  records: AttendanceRecordInput[]
}

export interface RequestAdvanceInput {
  employeeId: string
  amount: number
  reason: string
}

export function list(): Promise<Employee[]> {
  return apiFetch<Employee[]>('/employees')
}

export function getById(id: string): Promise<Employee> {
  return apiFetch<Employee>(`/employees/${id}`)
}

/** Job titles + which one makes someone a collection agent — the form's single source of roles. */
export function getRoles(): Promise<EmployeeRoles> {
  return apiFetch<EmployeeRoles>('/employees/roles')
}

export interface AgentHistoryQuery {
  from?: string
  to?: string
  /** 0-based */
  page?: number
  limit?: number
}

/** A collection agent's history (Employee detail → Collections tab): paginated, last 90 days by default. */
export function getCollections(id: string, q: AgentHistoryQuery = {}): Promise<PaginatedResult<AgentHistoryRow>> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) if (v !== undefined) params.set(k, String(v))
  const qs = params.toString()
  return apiFetch<PaginatedResult<AgentHistoryRow>>(`/employees/${id}/collections${qs ? `?${qs}` : ''}`)
}

/** A collection agent's finished fertilizer deliveries (Employee detail → Fertilizer deliveries tab). Same paging as Collections. */
export function getFertilizerDeliveries(id: string, q: AgentHistoryQuery = {}): Promise<PaginatedResult<AgentFertilizerRow>> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) if (v !== undefined) params.set(k, String(v))
  const qs = params.toString()
  return apiFetch<PaginatedResult<AgentFertilizerRow>>(`/employees/${id}/fertilizer-deliveries${qs ? `?${qs}` : ''}`)
}

export function create(input: EmployeeInput): Promise<Employee> {
  return apiFetch<Employee>('/employees', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function update(id: string, input: EmployeeInput): Promise<Employee> {
  return apiFetch<Employee>(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deactivate(id: string): Promise<Employee> {
  return apiFetch<Employee>(`/employees/${id}/deactivate`, { method: 'PATCH' })
}

export function listAttendance(employeeId?: string, month?: string): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams()
  if (employeeId) params.set('employeeId', employeeId)
  if (month) params.set('month', month)
  const qs = params.toString()
  return apiFetch<AttendanceRecord[]>(`/employees/attendance${qs ? `?${qs}` : ''}`)
}

export function markAttendance(input: MarkAttendanceInput): Promise<void> {
  return apiFetch<void>('/employees/attendance', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export interface AdvanceQuery {
  tab: AdvanceTab
  from?: string
  to?: string
  search?: string
  role?: string
  routeId?: number
  min?: number
  max?: number
  sort?: string
  dir?: 'asc' | 'desc'
  page?: number
  limit?: number
}

/** EMP-10 (Salary-Advances-Addendum) — server-side tabs, date range, filters and summary. */
export function listAdvances(q: AdvanceQuery): Promise<AdvanceListResult> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') params.set(k, String(v))
  return apiFetch<AdvanceListResult>(`/employees/advances?${params.toString()}`)
}

export function getAdvance(id: string): Promise<AdvanceDetail> {
  return apiFetch<AdvanceDetail>(`/employees/advances/${encodeURIComponent(id)}`)
}

/** An employee's advances + outstanding balance — the same calculation payroll uses. */
export function getEmployeeAdvances(employeeId: string): Promise<EmployeeAdvances> {
  return apiFetch<EmployeeAdvances>(`/employees/${employeeId}/advances`)
}

export function requestAdvance(input: RequestAdvanceInput): Promise<Advance> {
  return apiFetch<Advance>('/employees/advances', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** A reason is required to reject (the server refuses one without). */
export function decideAdvance(id: string, decision: 'approve' | 'reject', reason?: string): Promise<Advance> {
  return apiFetch<Advance>(`/employees/advances/${id}/decide`, {
    method: 'PATCH',
    body: JSON.stringify({ decision, reason }),
  })
}

export function listPayroll(period?: string, status?: string): Promise<PayrollRow[]> {
  const params = new URLSearchParams()
  if (period) params.set('period', period)
  if (status) params.set('status', status)
  const qs = params.toString()
  return apiFetch<PayrollRow[]>(`/employees/payroll${qs ? `?${qs}` : ''}`)
}

export function generatePayroll(period: string): Promise<PayrollRow[]> {
  return apiFetch<PayrollRow[]>('/employees/payroll/generate', {
    method: 'POST',
    body: JSON.stringify({ period }),
  })
}

export interface PayrollExclusion {
  employeeId: string
  reason: string
}

/** Bank-paid employees with no bank details must be listed in `exclusions`, with a reason. */
export function processPayroll(period: string, exclusions: PayrollExclusion[] = []): Promise<PayrollRow[]> {
  return apiFetch<PayrollRow[]>('/employees/payroll/process', {
    method: 'POST',
    body: JSON.stringify({ period, exclusions }),
  })
}

export interface PayrollMonthQuery {
  month: string
  search?: string
  role?: string
  routeId?: number
  status?: string
  /** comma-separated PayrollIssue values (any of) */
  issues?: string
  method?: string
  sort?: string
  dir?: 'asc' | 'desc'
  page?: number
  /** 0 = every row */
  limit?: number
}

/** Payroll by month, Part C — filtered server-side; summary + readiness cover the whole month. */
export function getPayrollMonth(q: PayrollMonthQuery): Promise<PayrollMonthResult> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') params.set(k, String(v))
  return apiFetch<PayrollMonthResult>(`/employees/payroll/month?${params.toString()}`)
}
