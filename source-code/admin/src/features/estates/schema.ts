import { z } from 'zod'

/* EST-02/04 validation rules (tea-estate-owner doc table). */

const NIC_RE = /^(\d{12}|\d{9}[vVxX])$/
const PHONE_RE = /^(?:\+94|0)\d{9}$/

export const estateOwnerSchema = z.object({
  // Owner details
  ownerName: z.string().min(1, 'Owner name is required'),
  nic: z.string().regex(NIC_RE, 'Enter a valid Sri Lankan NIC (12-digit or 9-digit + V/X)'),
  contact: z.string().regex(PHONE_RE, 'Enter a valid Sri Lankan number (0 or +94, 9–10 digits)'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),

  // Estate location & route (route itself is system-assigned, not part of the form)
  estateName: z.string().min(1, 'Estate name is required'),
  address: z.string().min(1, 'Estate address is required'),
  location: z.string().min(1, 'Location is required'),
  selfDelivery: z.boolean(),

  // Payment — a cash-paid owner needs no bank details (Settlement-Period-View-Addendum)
  paymentMethod: z.enum(['bank', 'cash']),
  bank: z.string(),
  branch: z.string(),
  account: z.string(),
}).superRefine((v, ctx) => {
  if (v.paymentMethod === 'cash') return
  if (!v.bank) ctx.addIssue({ code: 'custom', path: ['bank'], message: 'Bank is required' })
  if (!v.branch) ctx.addIssue({ code: 'custom', path: ['branch'], message: 'Branch is required' })
  if (!/^\d+$/.test(v.account)) ctx.addIssue({ code: 'custom', path: ['account'], message: 'Account number must be numeric' })
})

export type EstateOwnerForm = z.infer<typeof estateOwnerSchema>

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'bank', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
]

export const BANKS = ['Bank of Ceylon', "People's Bank", 'Commercial Bank', 'Hatton National Bank', 'Sampath Bank']
export const BRANCHES = ['Nuwara Eliya', 'Kandy', 'Hatton', 'Gampola', 'Talawakelle', 'Colombo']
