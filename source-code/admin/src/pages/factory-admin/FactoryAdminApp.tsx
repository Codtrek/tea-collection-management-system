import { useState } from 'react'
import { SidebarLayout} from '../../layouts/SidebarLayout'
import { FactoryDashboard } from './FactoryDashboard'
import { FactoryRegistration } from './FactoryRegistration'
import { FactoryTeaCollection } from './FactoryTeaCollection'
import { FactoryFertilizer } from './FactoryFertilizer'
import { FactoryEstatePayments } from './FactoryEstatePayments'
import { FactoryPayroll } from './FactoryPayroll'
import { FactorySalaryAdvances } from './FactorySalaryAdvances'
import { FactoryAttendance } from './FactoryAttendance'
import { FactoryPerformance } from './FactoryPerformance'
import { FactoryCollectionReport } from './FactoryCollectionReport'
import { FactoryRevenueReport } from './FactoryRevenueReport'
import { FactoryExpenseReport } from './FactoryExpenseReport'
import { type LogoutProps, type FactoryAdminScreen } from '../../types'

export const FactoryAdminApp = ({ onLogout: _onLogout }: LogoutProps) => {
  const [screen, setScreen] = useState<FactoryAdminScreen>("dashboard");
  const nav = [
    { label:"Overview",   items:[{ key:"dashboard",       icon:"dashboard", label:"Factory Dashboard" }] },
    { label:"Setup",      items:[{ key:"registration",    icon:"factory",   label:"Factory Registration" }] },
    { label:"Operations", items:[{ key:"tea-collection",  icon:"scale",     label:"Tea Leaves Collection" }, { key:"fertilizer", icon:"seeding", label:"Fertilizer Inventory" }] },
    { label:"Finance",    items:[{ key:"estate-payments", icon:"currency",  label:"Estate Owner Payments" }, { key:"payroll", icon:"cash", label:"Payroll" }, { key:"salary-advances", icon:"receipt", label:"Salary Advances" }] },
    { label:"Employees",  items:[{ key:"attendance",      icon:"calendar",  label:"Attendance" }, { key:"performance", icon:"users", label:"Performance Tracking" }] },
    { label:"Reports",    items:[{ key:"collection-report", icon:"clipboard", label:"Collection Report" }, { key:"revenue-report", icon:"chart", label:"Revenue Report" }, { key:"expense-report", icon:"receipt", label:"Expense Report" }] },
  ];
  const titles = { dashboard:"Factory Dashboard", registration:"Factory Registration", "tea-collection":"Tea Leaves Collection", fertilizer:"Fertilizer Inventory", "estate-payments":"Estate Owner Payments", payroll:"Payroll", "salary-advances":"Salary Advances", attendance:"Employee Attendance", performance:"Performance Tracking", "collection-report":"Collection Report", "revenue-report":"Revenue Report", "expense-report":"Expense Report" };
  const screens = { dashboard:<FactoryDashboard/>, registration:<FactoryRegistration/>, "tea-collection":<FactoryTeaCollection/>, fertilizer:<FactoryFertilizer/>, "estate-payments":<FactoryEstatePayments/>, payroll:<FactoryPayroll/>, "salary-advances":<FactorySalaryAdvances/>, attendance:<FactoryAttendance/>, performance:<FactoryPerformance/>, "collection-report":<FactoryCollectionReport/>, "revenue-report":<FactoryRevenueReport/>, "expense-report":<FactoryExpenseReport/> };
  return (
    <SidebarLayout nav={nav} active={screen} onNav={(key) => setScreen(key as FactoryAdminScreen)} title={titles[screen]||"Factory Admin"} badge="Tea Season Active" user={{ initials:"FA", name:"Factory Admin", role:"Factory Administrator" }} role="Factory Admin">
      {screens[screen]}
    </SidebarLayout>
  );
};
