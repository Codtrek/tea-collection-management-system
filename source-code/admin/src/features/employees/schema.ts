import { z } from 'zod'

/* EMP-02 validation rules (employee-management-screen-prompt.md table). */

const NIC_RE = /^(\d{12}|\d{9}[vVxX])$/
const PHONE_RE = /^(?:\+94|0)\d{9}$/

function age(dob: string): number {
  const d = new Date(dob)
  const diff = Date.now() - d.getTime()
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
}

export const employeeSchema = z.object({
  // Personal
  name: z.string().min(1, 'Full name is required'),
  nic: z.string().regex(NIC_RE, 'Enter a valid Sri Lankan NIC (12-digit or 9-digit + V/X)'),
  dob: z
    .string()
    .min(1, 'Date of birth is required')
    .refine((v) => age(v) >= 18, 'Employee must be 18 or older'),
  contact: z.string().regex(PHONE_RE, 'Enter a valid Sri Lankan number (0 or +94, 9–10 digits)'),
  address: z.string().min(1, 'Address is required'),

  // Employment
  role: z.string().min(1, 'Role is required'),
  department: z.string().min(1, 'Department is required'),
  hireDate: z
    .string()
    .min(1, 'Hire date is required')
    .refine((v) => new Date(v) <= new Date(), 'Hire date cannot be in the future'),
  employmentType: z.enum(['Permanent', 'Contract', 'Casual']),

  // Bank
  bank: z.string().min(1, 'Bank is required'),
  branch: z.string().min(1, 'Branch is required'),
  account: z.string().regex(/^\d+$/, 'Account number must be numeric'),

  // Permissions
  hasLogin: z.boolean(),

  // Pay rates (shift-based: Day / Day-OT / Night / Night-OT — feeds payroll generation).
  // z.coerce.number() breaks zodResolver typing with useForm<T> — use register(field,
  // { valueAsNumber: true }) instead (see Claude.md gotchas).
  dayRate: z.number().min(0, 'Rate cannot be negative'),
  dayOtRate: z.number().min(0, 'Rate cannot be negative'),
  nightRate: z.number().min(0, 'Rate cannot be negative'),
  nightOtRate: z.number().min(0, 'Rate cannot be negative'),
})

export type EmployeeForm = z.infer<typeof employeeSchema>

export const BANKS = ['Bank of Ceylon', "People's Bank", 'Commercial Bank', 'Hatton National Bank', 'Sampath Bank']
export const BRANCHES = ['Nuwara Eliya', 'Kandy', 'Hatton', 'Colombo']
export const DEPARTMENTS = ['Operations', 'Factory Floor', 'Logistics', 'Management', 'Administration']
export const ROLES = ['Factory Officer', 'Factory Manager', 'Machine Operator', 'Driver', 'Receiving Officer']
