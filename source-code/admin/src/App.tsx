import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { DesignFoundationsPage } from './pages/design-foundations/DesignFoundationsPage'
import { LoginPage } from './features/auth/LoginPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { NotificationCenterPage } from './features/notifications/NotificationCenterPage'
import { SearchResultsPage } from './features/search/SearchResultsPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { EmployeeListPage } from './features/employees/EmployeeListPage'
import { EmployeeRegistrationPage } from './features/employees/EmployeeRegistrationPage'
import { EmployeeDetailPage } from './features/employees/EmployeeDetailPage'
import { EmployeeEditPage } from './features/employees/EmployeeEditPage'
import { AttendanceOverviewPage } from './features/employees/AttendanceOverviewPage'
import { AttendanceEntryPage } from './features/employees/AttendanceEntryPage'
import { AdvanceListPage } from './features/employees/AdvanceListPage'
import { AdvanceDetailPage } from './features/employees/AdvanceDetailPage'
import { AdvanceRequestPage } from './features/employees/AdvanceRequestPage'
import { PayrollListPage } from './features/employees/PayrollListPage'
import { PayrollProcessingPage } from './features/employees/PayrollProcessingPage'
import { PayslipPage } from './features/employees/PayslipPage'
import { PerformancePage } from './features/employees/PerformancePage'
import { CollectionListPage } from './features/collections/CollectionListPage'
import { CollectionExceptionEntryPage } from './features/collections/CollectionExceptionEntryPage'
import { CollectionDetailPage } from './features/collections/CollectionDetailPage'
import { CollectionEditPage } from './features/collections/CollectionEditPage'
import { FertilizerStockListPage } from './features/fertilizer/FertilizerStockListPage'
import { StockMovementEntryPage } from './features/fertilizer/StockMovementEntryPage'
import { BatchDetailPage } from './features/fertilizer/BatchDetailPage'
import { FertilizerAlertsPage } from './features/fertilizer/FertilizerAlertsPage'
import { EstateListPage } from './features/estates/EstateListPage'
import { EstateRegistrationPage } from './features/estates/EstateRegistrationPage'
import { EstateDetailPage } from './features/estates/EstateDetailPage'
import { EstateEditPage } from './features/estates/EstateEditPage'
import { EstateAdvanceListPage } from './features/estates/EstateAdvanceListPage'
import { IssueAdvancePage } from './features/estates/IssueAdvancePage'
import { SettlementListPage } from './features/estates/SettlementListPage'
import { SettlementProcessPage } from './features/estates/SettlementProcessPage'
import { EstateAnalyticsPage } from './features/estates/EstateAnalyticsPage'
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
      { path: 'collections', element: <CollectionListPage /> },
      { path: 'collections/new', element: <CollectionExceptionEntryPage /> },
      { path: 'collections/:id', element: <CollectionDetailPage /> },
      { path: 'collections/:id/edit', element: <CollectionEditPage /> },

      // Operations — Fertilizer Inventory (FERT-01..04)
      { path: 'fertilizer', element: <FertilizerStockListPage /> },
      { path: 'fertilizer/movement/new', element: <StockMovementEntryPage /> },
      { path: 'fertilizer/alerts', element: <FertilizerAlertsPage /> },
      { path: 'fertilizer/:batchId', element: <BatchDetailPage /> },

      // Finance — Tea Estate Owner (EST-01..09)
      { path: 'estates', element: <EstateListPage /> },
      { path: 'estates/new', element: <EstateRegistrationPage /> },
      { path: 'estates/advances', element: <EstateAdvanceListPage /> },
      { path: 'estates/advances/new', element: <IssueAdvancePage /> },
      { path: 'estates/settlements', element: <SettlementListPage /> },
      { path: 'estates/settlements/process', element: <SettlementProcessPage /> },
      { path: 'estates/analytics', element: <EstateAnalyticsPage /> },
      { path: 'estates/:id', element: <EstateDetailPage /> },
      { path: 'estates/:id/edit', element: <EstateEditPage /> },

      // People / Finance — Employee module (EMP-01..14)
      { path: 'employees', element: <EmployeeListPage /> },
      { path: 'employees/new', element: <EmployeeRegistrationPage /> },
      { path: 'employees/attendance', element: <AttendanceOverviewPage /> },
      { path: 'employees/attendance/entry', element: <AttendanceEntryPage /> },
      { path: 'employees/advances', element: <AdvanceListPage /> },
      { path: 'employees/advances/new', element: <AdvanceRequestPage /> },
      { path: 'employees/advances/:id', element: <AdvanceDetailPage /> },
      { path: 'employees/payroll', element: <PayrollListPage /> },
      { path: 'employees/payroll/process', element: <PayrollProcessingPage /> },
      { path: 'employees/payroll/:id/payslip', element: <PayslipPage /> },
      { path: 'employees/performance', element: <PerformancePage /> },
      { path: 'employees/:id', element: <EmployeeDetailPage /> },
      { path: 'employees/:id/edit', element: <EmployeeEditPage /> },

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
