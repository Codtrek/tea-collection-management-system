import {
  LayoutDashboard,
  Leaf,
  Sprout,
  ClipboardList,
  Wallet,
  Banknote,
  HandCoins,
  Users,
  CalendarCheck,
  TrendingUp,
  BarChart3,
  FileText,
  Settings2,
  ShieldCheck,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'
import type { ModuleKey } from '@/types'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  module: ModuleKey
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

/* Sidebar IA (master brief §3). Items appear/disappear by permission (§4). */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, module: 'dashboard' }],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Tea Leaf Collection', to: '/operations/collections', icon: Leaf, module: 'collection' },
      { label: 'Fertilizer Inventory', to: '/operations/fertilizer-inventory', icon: Sprout, module: 'fertilizer' },
      { label: 'Fertilizer Requests', to: '/operations/fertilizer-requests', icon: ClipboardList, module: 'fertilizer' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Estate Owner Payments', to: '/finance/estate-payments', icon: Wallet, module: 'estateOwners' },
      { label: 'Payroll', to: '/finance/payroll', icon: Banknote, module: 'payroll' },
      { label: 'Salary Advances', to: '/finance/salary-advances', icon: HandCoins, module: 'advances' },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Employees', to: '/people/employees', icon: Users, module: 'employees' },
      { label: 'Attendance', to: '/people/attendance', icon: CalendarCheck, module: 'attendance' },
      { label: 'Performance', to: '/people/employees/performance', icon: TrendingUp, module: 'performance' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Collection Reports', to: '/reports/collection', icon: BarChart3, module: 'reports' },
      { label: 'Revenue Reports', to: '/reports/revenue', icon: TrendingUp, module: 'reports' },
      { label: 'Expense Reports', to: '/reports/expenses', icon: FileText, module: 'reports' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Factory Setup', to: '/admin/factory-setup', icon: Settings2, module: 'administration' },
      { label: 'Users & Roles', to: '/admin/users', icon: ShieldCheck, module: 'administration' },
      { label: 'System Settings', to: '/admin/settings', icon: Settings2, module: 'administration' },
      { label: 'Audit Logs', to: '/admin/audit-logs', icon: ScrollText, module: 'administration' },
    ],
  },
]
