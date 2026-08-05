import {
  LayoutDashboard,
  Leaf,
  Sprout,
  ClipboardList,
  Wallet,
  Banknote,
  HandCoins,
  Users,
  Mountain,
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
      { label: 'Tea Leaf Collection', to: '/collections', icon: Leaf, module: 'collection' },
      { label: 'Fertilizer Inventory', to: '/fertilizer', icon: Sprout, module: 'fertilizer' },
      { label: 'Fertilizer Requests', to: '/fertilizer/requests', icon: ClipboardList, module: 'fertilizer' },
    ],
  },
  {
    label: 'Finance',
    items: [
      // EST-01 amended — was pointed at the roster itself; now the actual
      // payments action (Process Settlements), since browsing owners moved
      // to its own People entry below and would otherwise duplicate this one.
      { label: 'Estate Owner Payments', to: '/estates/settlements', icon: Wallet, module: 'estateOwners' },
      { label: 'Payroll', to: '/employees/payroll', icon: Banknote, module: 'payroll' },
      { label: 'Salary Advances', to: '/employees/advances', icon: HandCoins, module: 'advances' },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Estate Owners', to: '/estates', icon: Mountain, module: 'estateOwners' },
      { label: 'Employees', to: '/employees', icon: Users, module: 'employees' },
      { label: 'Attendance', to: '/employees/attendance', icon: CalendarCheck, module: 'attendance' },
      { label: 'Performance', to: '/employees/performance', icon: TrendingUp, module: 'performance' },
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
