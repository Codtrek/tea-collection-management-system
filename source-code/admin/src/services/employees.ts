import { apiFetch } from '@/lib/api'
import type { PaginatedResult } from '@/features/estates/types'
import type {
  AgentHistoryRow,
  Advance,
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

export function listAdvances(): Promise<Advance[]> {
  return apiFetch<Advance[]>('/employees/advances')
}

export function requestAdvance(input: RequestAdvanceInput): Promise<Advance> {
  return apiFetch<Advance>('/employees/advances', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function decideAdvance(id: string, decision: 'approve' | 'reject'): Promise<Advance> {
  return apiFetch<Advance>(`/employees/advances/${id}/decide`, {
    method: 'PATCH',
    body: JSON.stringify({ decision }),
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

export function processPayroll(period?: string): Promise<PayrollRow[]> {
  return apiFetch<PayrollRow[]>('/employees/payroll/process', {
    method: 'POST',
    body: JSON.stringify(period ? { period } : {}),
  })
}
