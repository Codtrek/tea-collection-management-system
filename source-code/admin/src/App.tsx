import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { DesignFoundationsPage } from './pages/design-foundations/DesignFoundationsPage'
import { LoginPage } from './features/auth/LoginPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { NotificationCenterPage } from './features/notifications/NotificationCenterPage'
import { SearchResultsPage } from './features/search/SearchResultsPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { EmployeeListPage } from '@/features/people/employees/EmployeeListPage'
import { EmployeeRegistrationPage } from '@/features/people/employees/EmployeeRegistrationPage'
import { EmployeeDetailPage } from '@/features/people/employees/EmployeeDetailPage'
import { EmployeeEditPage } from '@/features/people/employees/EmployeeEditPage'
import { AttendanceOverviewPage } from '@/features/people/attendance/AttendanceOverviewPage'
import { AttendanceEntryPage } from '@/features/people/attendance/AttendanceEntryPage'
import { AdvanceListPage } from '@/features/finance/salary-advances/AdvanceListPage'
import { AdvanceDetailPage } from '@/features/finance/salary-advances/AdvanceDetailPage'
import { AdvanceRequestPage } from '@/features/finance/salary-advances/AdvanceRequestPage'
import { PayrollListPage } from '@/features/finance/payroll/PayrollListPage'
import { PayrollProcessingPage } from '@/features/finance/payroll/PayrollProcessingPage'
import { PayslipPage } from '@/features/finance/payroll/PayslipPage'
import { PerformancePage } from '@/features/people/employees/PerformancePage'
import { CollectionListPage } from '@/features/operations/collections/CollectionListPage'
import { CollectionExceptionEntryPage } from '@/features/operations/collections/CollectionExceptionEntryPage'
import { CollectionDetailPage } from '@/features/operations/collections/CollectionDetailPage'
import { CollectionEditPage } from '@/features/operations/collections/CollectionEditPage'
import { FertilizerStockListPage } from '@/features/operations/fertilizer-inventory/FertilizerStockListPage'
import { StockMovementEntryPage } from '@/features/operations/fertilizer-inventory/StockMovementEntryPage'
import { BatchDetailPage } from '@/features/operations/fertilizer-inventory/BatchDetailPage'
import { FertilizerAlertsPage } from '@/features/operations/fertilizer-inventory/FertilizerAlertsPage'
import { RequestQueuePage } from '@/features/operations/fertilizer-requests/RequestQueuePage'
import { RequestDetailPage } from '@/features/operations/fertilizer-requests/RequestDetailPage'
import { LogRequestPage } from '@/features/operations/fertilizer-requests/LogRequestPage'
import { EstateListPage } from '@/features/people/estates/EstateListPage'
import { EstateRegistrationPage } from '@/features/people/estates/EstateRegistrationPage'
import { EstateDetailPage } from '@/features/people/estates/EstateDetailPage'
import { EstateEditPage } from '@/features/people/estates/EstateEditPage'
import { EstateAdvanceListPage } from '@/features/finance/estate-payments/EstateAdvanceListPage'
import { IssueAdvancePage } from '@/features/finance/estate-payments/IssueAdvancePage'
import { SettlementListPage } from '@/features/finance/estate-payments/SettlementListPage'
import { SettlementProcessPage } from '@/features/finance/estate-payments/SettlementProcessPage'
import { EstateAnalyticsPage } from '@/features/finance/estate-payments/EstateAnalyticsPage'
import { CollectionReportPage } from './features/reports/CollectionReportPage'
import { RevenueReportPage } from './features/reports/RevenueReportPage'
import { ExpenseReportPage } from './features/reports/ExpenseReportPage'
import { ExpenseEntryPage } from './features/reports/ExpenseEntryPage'
import { FactorySetupPage } from './features/admin/FactorySetupPage'
import { UsersRolesPage } from './features/admin/UsersRolesPage'
import { SystemSettingsPage } from './features/admin/SystemSettingsPage'
import { AuditLogsPage } from './features/admin/AuditLogsPage'

/* Route map — all six modules built. Static paths precede :id params. */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/design-foundations', element: <DesignFoundationsPage /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },

      // Operations — Tea Leaf Collection (COL-01..04)
      { path: 'operations/collections', element: <CollectionListPage /> },
      { path: 'operations/collections/new', element: <CollectionExceptionEntryPage /> },
      { path: 'operations/collections/:id', element: <CollectionDetailPage /> },
      { path: 'operations/collections/:id/edit', element: <CollectionEditPage /> },

      // Operations — Fertilizer Inventory (FERT-01..07)
      { path: 'operations/fertilizer-inventory', element: <FertilizerStockListPage /> },
      { path: 'operations/fertilizer-inventory/movement/new', element: <StockMovementEntryPage /> },
      { path: 'operations/fertilizer-inventory/alerts', element: <FertilizerAlertsPage /> },
      // Request workflow — static paths must precede fertilizer/:batchId
      { path: 'operations/fertilizer-requests', element: <RequestQueuePage /> },
      { path: 'operations/fertilizer-requests/new', element: <LogRequestPage /> },
      { path: 'operations/fertilizer-requests/:id', element: <RequestDetailPage /> },
      { path: 'operations/fertilizer-inventory/:batchId', element: <BatchDetailPage /> },

      // Finance — Tea Estate Owner (EST-01..09)
      { path: 'finance/estate-payments', element: <EstateListPage /> },
      { path: 'people/estates/new', element: <EstateRegistrationPage /> },
      { path: 'finance/estate-payments/advances', element: <EstateAdvanceListPage /> },
      { path: 'finance/estate-payments/advances/new', element: <IssueAdvancePage /> },
      { path: 'finance/estate-payments/settlements', element: <SettlementListPage /> },
      { path: 'finance/estate-payments/settlements/process', element: <SettlementProcessPage /> },
      { path: 'people/estates/analytics', element: <EstateAnalyticsPage /> },
      { path: 'people/estates/:id', element: <EstateDetailPage /> },
      { path: 'people/estates/:id/edit', element: <EstateEditPage /> },

      // People / Finance — Employee module (EMP-01..14)
      { path: 'people/employees', element: <EmployeeListPage /> },
      { path: 'people/employees/new', element: <EmployeeRegistrationPage /> },
      { path: 'people/attendance', element: <AttendanceOverviewPage /> },
      { path: 'people/attendance/entry', element: <AttendanceEntryPage /> },
      { path: 'finance/salary-advances', element: <AdvanceListPage /> },
      { path: 'finance/salary-advances/new', element: <AdvanceRequestPage /> },
      { path: 'finance/salary-advances/:id', element: <AdvanceDetailPage /> },
      { path: 'finance/payroll', element: <PayrollListPage /> },
      { path: 'finance/payroll/process', element: <PayrollProcessingPage /> },
      { path: 'finance/payroll/:id/payslip', element: <PayslipPage /> },
      { path: 'people/employees/performance', element: <PerformancePage /> },
      { path: 'people/employees/:id', element: <EmployeeDetailPage /> },
      { path: 'people/employees/:id/edit', element: <EmployeeEditPage /> },

      // Reports (RPT-01..04)
      { path: 'reports/collection', element: <CollectionReportPage /> },
      { path: 'reports/revenue', element: <RevenueReportPage /> },
      { path: 'reports/expenses', element: <ExpenseReportPage /> },
      { path: 'reports/expenses/new', element: <ExpenseEntryPage /> },
      { path: 'reports', element: <Navigate to="/reports/collection" replace /> },

      // Administration (ADM-01..04) — Administrator-only via AdminGuard
      { path: 'admin/factory-setup', element: <FactorySetupPage /> },
      { path: 'admin/users', element: <UsersRolesPage /> },
      { path: 'admin/settings', element: <SystemSettingsPage /> },
      { path: 'admin/audit-logs', element: <AuditLogsPage /> },
      { path: 'admin', element: <Navigate to="/admin/factory-setup" replace /> },

      // Global / cross-cutting
      { path: 'notifications', element: <NotificationCenterPage /> },
      { path: 'search', element: <SearchResultsPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
