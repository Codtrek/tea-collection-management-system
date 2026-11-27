import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RouteError } from './components/data/RouteError'
import { AppShell } from './components/layout/AppShell'
import { DesignFoundationsPage } from './pages/design-foundations/DesignFoundationsPage'
import { LoginPage } from './features/auth/LoginPage'
import { ChangePasswordPage } from './features/auth/ChangePasswordPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { NotificationCenterPage } from './features/notifications/NotificationCenterPage'
import { SearchResultsPage } from './features/search/SearchResultsPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { EmployeeListPage } from './features/employees/EmployeeListPage'
import { EmployeeRegistrationPage } from './features/employees/EmployeeRegistrationPage'
import { EmployeeDetailPage } from './features/employees/EmployeeDetailPage'
import { EmployeeEditPage } from './features/employees/EmployeeEditPage'
import { AttendanceOverviewPage } from './features/employees/AttendanceOverviewPage'
import { HolidayCalendarPage } from './features/holidays/HolidayCalendarPage'
import { AttendanceEntryPage } from './features/employees/AttendanceEntryPage'
import { AdvanceListPage } from './features/employees/AdvanceListPage'
import { AdvanceDetailPage } from './features/employees/AdvanceDetailPage'
import { AdvanceRequestPage } from './features/employees/AdvanceRequestPage'
import { PayRatesPage } from './features/employees/PayRatesPage'
import { PayChangePage } from './features/employees/PayChangePage'
import { PayrollListPage } from './features/employees/PayrollListPage'
import { PayrollProcessingPage } from './features/employees/PayrollProcessingPage'
import { PayslipPage } from './features/employees/PayslipPage'
import { PerformancePage } from './features/performance/PerformancePage'
import { HowMeasuredPage } from './features/performance/HowMeasuredPage'
import { CollectionListPage } from './features/collections/CollectionListPage'
import { CollectionExceptionEntryPage } from './features/collections/CollectionExceptionEntryPage'
import { DispatchBoardPage } from './features/dispatch/DispatchBoardPage'
import { CollectionDetailPage } from './features/collections/CollectionDetailPage'
import { CollectionEditPage } from './features/collections/CollectionEditPage'
import { FertilizerStockListPage } from './features/fertilizer/FertilizerStockListPage'
import { ItemPricesPage } from './features/fertilizer/ItemPricesPage'
import { StockMovementEntryPage } from './features/fertilizer/StockMovementEntryPage'
import { BatchDetailPage } from './features/fertilizer/BatchDetailPage'
import { FertilizerAlertsPage } from './features/fertilizer/FertilizerAlertsPage'
import { RequestQueuePage } from './features/fertilizer/RequestQueuePage'
import { RequestDetailPage } from './features/fertilizer/RequestDetailPage'
import { LogRequestPage } from './features/fertilizer/LogRequestPage'
import { EstateListPage } from './features/estates/EstateListPage'
import { EstateRegistrationPage } from './features/estates/EstateRegistrationPage'
import { EstateDetailPage } from './features/estates/EstateDetailPage'
import { EstateEditPage } from './features/estates/EstateEditPage'
import { EstateAdvanceListPage } from './features/estates/EstateAdvanceListPage'
import { IssueAdvancePage } from './features/estates/IssueAdvancePage'
import { EstateAdvanceDetailPage } from './features/estates/EstateAdvanceDetailPage'
import { SettlementListPage } from './features/estates/SettlementListPage'
import { SettlementProcessPage } from './features/estates/SettlementProcessPage'
import { SettlementDetailPage } from './features/estates/SettlementDetailPage'
import { UnsettledOwnersPage } from './features/estates/UnsettledOwnersPage'
import { EstateAnalyticsPage } from './features/estates/EstateAnalyticsPage'
import { CollectionReportPage } from './features/reports/CollectionReportPage'
import { LeafPurchaseReportPage } from './features/reports/LeafPurchaseReportPage'
import { RedirectWithQuery } from './components/layout/RedirectWithQuery'
import { ExpenseReportPage } from './features/reports/ExpenseReportPage'
import { ExpenseEntryPage } from './features/reports/ExpenseEntryPage'
import { FactorySetupPage } from './features/admin/FactorySetupPage'
import { UsersRolesPage } from './features/admin/UsersRolesPage'
import { AccessGuard } from './components/layout/AccessGuard'
import { SystemSettingsPage } from './features/admin/SystemSettingsPage'
import { AuditLogsPage } from './features/admin/AuditLogsPage'

/* Route map — all six modules built. Static paths precede :id params. */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  // outside the shell: a temporary password must be replaced before any portal page opens
  { path: '/change-password', element: <ChangePasswordPage /> },
  { path: '/design-foundations', element: <DesignFoundationsPage /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      // a render error shows a friendly message with Retry, inside the shell (Dashboard-Addendum)
      { path: 'dashboard', element: <AccessGuard module={'dashboard'}><DashboardPage /></AccessGuard>, errorElement: <RouteError title="The dashboard couldn't be shown" /> },

      // Operations — Tea Leaf Collection (COL-01..04)
      { path: 'collections', element: <AccessGuard module={'collection'}><CollectionListPage /></AccessGuard> },
      { path: 'collections/new', element: <AccessGuard module={'collection'}><CollectionExceptionEntryPage /></AccessGuard> },
      // Agent Dispatch (COL-05) — static path, before collections/:id
      { path: 'collections/dispatch', element: <AccessGuard module={'dispatch'}><DispatchBoardPage /></AccessGuard> },
      { path: 'collections/:id', element: <AccessGuard module={'collection'}><CollectionDetailPage /></AccessGuard> },
      { path: 'collections/:id/edit', element: <AccessGuard module={'collection'}><CollectionEditPage /></AccessGuard> },

      // Operations — Fertilizer Inventory (FERT-01..07)
      { path: 'fertilizer', element: <AccessGuard module={'fertilizer'}><FertilizerStockListPage /></AccessGuard> },
      { path: 'fertilizer/movement/new', element: <AccessGuard module={'fertilizer'}><StockMovementEntryPage /></AccessGuard> },
      { path: 'fertilizer/alerts', element: <AccessGuard module={'fertilizer'}><FertilizerAlertsPage /></AccessGuard> },
      { path: 'fertilizer/prices', element: <AccessGuard module={['itemPrices', 'fertilizer']}><ItemPricesPage /></AccessGuard> },
      // Request workflow — static paths must precede fertilizer/:batchId
      { path: 'fertilizer/requests', element: <AccessGuard module={'fertilizer'}><RequestQueuePage /></AccessGuard> },
      { path: 'fertilizer/requests/new', element: <AccessGuard module={'fertilizer'}><LogRequestPage /></AccessGuard> },
      { path: 'fertilizer/requests/:id', element: <AccessGuard module={'fertilizer'}><RequestDetailPage /></AccessGuard> },
      { path: 'fertilizer/:batchId', element: <AccessGuard module={'fertilizer'}><BatchDetailPage /></AccessGuard> },

      // Finance — Tea Estate Owner (EST-01..09)
      { path: 'estates', element: <AccessGuard module={'estateOwners'}><EstateListPage /></AccessGuard> },
      { path: 'estates/new', element: <AccessGuard module={'estateOwners'}><EstateRegistrationPage /></AccessGuard> },
      { path: 'estates/advances', element: <AccessGuard module={'estateAdvances'}><EstateAdvanceListPage /></AccessGuard> },
      { path: 'estates/advances/new', element: <AccessGuard module={'estateAdvances'}><IssueAdvancePage /></AccessGuard> },
      { path: 'estates/advances/:id', element: <AccessGuard module={'estateAdvances'}><EstateAdvanceDetailPage /></AccessGuard> },
      { path: 'estates/settlements', element: <AccessGuard module={'estateOwners'}><SettlementListPage /></AccessGuard> },
      { path: 'estates/settlements/process', element: <AccessGuard module={'estateOwners'}><SettlementProcessPage /></AccessGuard> },
      { path: 'estates/settlements/unsettled', element: <AccessGuard module={'estateOwners'}><UnsettledOwnersPage /></AccessGuard> },
      { path: 'estates/settlements/:id', element: <AccessGuard module={'estateOwners'}><SettlementDetailPage /></AccessGuard> },
      { path: 'estates/analytics', element: <AccessGuard module={'estateOwners'}><EstateAnalyticsPage /></AccessGuard> },
      { path: 'estates/:id', element: <AccessGuard module={'estateOwners'}><EstateDetailPage /></AccessGuard> },
      { path: 'estates/:id/edit', element: <AccessGuard module={'estateOwners'}><EstateEditPage /></AccessGuard> },

      // People / Finance — Employee module (EMP-01..14)
      { path: 'employees', element: <AccessGuard module={'employees'}><EmployeeListPage /></AccessGuard> },
      { path: 'employees/new', element: <AccessGuard module={'employees'}><EmployeeRegistrationPage /></AccessGuard> },
      { path: 'employees/attendance', element: <AccessGuard module={'attendance'}><AttendanceOverviewPage /></AccessGuard> },
      { path: 'employees/attendance/entry', element: <AccessGuard module={'attendance'}><AttendanceEntryPage /></AccessGuard> },
      { path: 'holidays', element: <AccessGuard module={['holidayCalendar', 'holidayStatutory', 'attendance']}><HolidayCalendarPage /></AccessGuard> },
      { path: 'employees/advances', element: <AccessGuard module={'advances'}><AdvanceListPage /></AccessGuard> },
      { path: 'employees/advances/new', element: <AccessGuard module={'advances'}><AdvanceRequestPage /></AccessGuard> },
      { path: 'employees/advances/:id', element: <AccessGuard module={'advances'}><AdvanceDetailPage /></AccessGuard> },
      { path: 'employees/payroll', element: <AccessGuard module={'payroll'}><PayrollListPage /></AccessGuard> },
      { path: 'employees/pay-rates', element: <AccessGuard module={'payRates'}><PayRatesPage /></AccessGuard> },
      { path: 'employees/pay-rates/change', element: <AccessGuard module={'payRates'}><PayChangePage /></AccessGuard> },
      { path: 'employees/payroll/process', element: <AccessGuard module={'payroll'}><PayrollProcessingPage /></AccessGuard> },
      { path: 'employees/payroll/:id/payslip', element: <AccessGuard module={'payroll'}><PayslipPage /></AccessGuard> },
      { path: 'employees/performance', element: <AccessGuard module={'performance'}><PerformancePage /></AccessGuard> },
      { path: 'employees/performance/how', element: <AccessGuard module={'performance'}><HowMeasuredPage /></AccessGuard> },
      { path: 'employees/:id', element: <AccessGuard module={'employees'}><EmployeeDetailPage /></AccessGuard> },
      { path: 'employees/:id/edit', element: <AccessGuard module={'employees'}><EmployeeEditPage /></AccessGuard> },

      // Reports (RPT-01..04)
      { path: 'reports/collection', element: <AccessGuard module={'reports'}><CollectionReportPage /></AccessGuard> },
      { path: 'reports/leaf-purchases', element: <AccessGuard module={'reports'}><LeafPurchaseReportPage /></AccessGuard> },
      // renamed 2026-11-15: what it shows is a cost (leaf bought from estate owners), not revenue
      { path: 'reports/revenue', element: <RedirectWithQuery to="/reports/leaf-purchases" /> },
      { path: 'reports/expenses', element: <AccessGuard module={['expenses', 'reports']}><ExpenseReportPage /></AccessGuard> },
      { path: 'reports/expenses/new', element: <AccessGuard module={['expenses', 'reports']}><ExpenseEntryPage /></AccessGuard> },
      { path: 'reports/expenses/:id', element: <AccessGuard module={['expenses', 'reports']}><ExpenseEntryPage /></AccessGuard> },
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
