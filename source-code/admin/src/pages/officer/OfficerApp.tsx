import { useState } from 'react'
import { SidebarLayout} from '../../layouts/SidebarLayout'
import { OfficerTeaWeight } from './OfficerTeaWeight';
import { OfficerAttendance } from './OfficerAttendance';
import { OfficerExpenses } from './OfficerExpenses';
import { OfficerFertilizer } from './OfficerFertilizer';
import { OfficerProduction } from './OfficerProduction';
import { OfficerRegistration } from './OfficerRegistration';
import { OfficerSalary } from './OfficerSalary';
import { OfficerSupplierPayments } from './OfficerSupplierPayments';
import { type LogoutProps, type OfficerScreen } from '../../types'

export const OfficerApp = ({ onLogout: _onLogout } : LogoutProps) => {
  const [screen, setScreen] = useState<OfficerScreen>("tea-weight");
  const nav = [
    { label:"Operations",    items:[{ key:"tea-weight",  icon:"scale",     label:"Tea Weight Entry" }, { key:"fertilizer",  icon:"seeding",   label:"Fertilizer" }, { key:"attendance",  icon:"calendar",  label:"Attendance" }, { key:"production",  icon:"leaf",     label:"Tea Production" }] },
    { label:"People",        items:[{ key:"registration",icon:"users",     label:"Register" }] },
    { label:"Finance",       items:[{ key:"salary",      icon:"cash",      label:"Salary" }, { key:"supplier-pay",icon:"currency",  label:"Supplier Fees" }, { key:"expenses",    icon:"receipt",   label:"Expenses" }] },
  ];
  const titles = { "tea-weight":"Tea Weight Entry", fertilizer:"Fertilizer Management", attendance:"Attendance", production:"Tea Production", registration:"Register Employee / Supplier", salary:"Salary Management", "supplier-pay":"Supplier Tea Leaf Fees", expenses:"Expenses" };
  const screens = { "tea-weight":<OfficerTeaWeight/>, fertilizer:<OfficerFertilizer/>, attendance:<OfficerAttendance/>, production:<OfficerProduction/>, registration:<OfficerRegistration/>, salary:<OfficerSalary/>, "supplier-pay":<OfficerSupplierPayments/>, expenses:<OfficerExpenses/> };
  return (
    <SidebarLayout nav={nav} active={screen} onNav={(key) => setScreen(key as OfficerScreen)} title={titles[screen]||"Officer"} badge="Tea Season Active" user={{ initials:"FO", name:"Factory Officer", role:"Data Entry Officer" }} role="Factory Officer">
      {screens[screen]}
    </SidebarLayout>
  );
};
