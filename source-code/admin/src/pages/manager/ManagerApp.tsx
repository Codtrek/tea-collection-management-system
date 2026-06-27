import { useState } from 'react'
import { SidebarLayout} from '../../layouts/SidebarLayout'
import { ManagerDashboard } from './ManagerDashboard'   
import { ManagerTeaAnalysis } from './ManagerTeaAnalysis'
import { ManagerFertilizer } from './ManagerFertilizer'
import { ManagerProduction } from './ManagerProduction'
import { ManagerFinance } from './ManagerFinance'
import { ManagerPerformance } from './ManagerPerformance'

type ManagerScreen =
  | "dashboard"
  | "tea"
  | "fertilizer"
  | "production"
  | "finance"
  | "performance";

export const ManagerApp = ({ onLogout }: { onLogout: () => void }) => {
  const [screen, setScreen] = useState<ManagerScreen>("dashboard");
  const nav = [
    { label:"Overview",   items:[{ key:"dashboard",   icon:"dashboard", label:"Dashboard" }] },
    { label:"Analysis",   items:[{ key:"tea",         icon:"scale",     label:"Tea Collection" }, { key:"fertilizer",  icon:"seeding",   label:"Fertilizer" }, { key:"production",  icon:"leaf",      label:"Production" }] },
    { label:"Finance",    items:[{ key:"finance",     icon:"chart",     label:"Income & Expenses" }] },
    { label:"People",     items:[{ key:"performance", icon:"users",     label:"Performance" }] },
  ];
  const titles = { dashboard:"Manager Dashboard", tea:"Tea Collection Analysis", fertilizer:"Fertilizer Analysis", production:"Tea Production", finance:"Income & Expenses", performance:"Employee Performance" };
  const screens = { dashboard:<ManagerDashboard/>, tea:<ManagerTeaAnalysis/>, fertilizer:<ManagerFertilizer/>, production:<ManagerProduction/>, finance:<ManagerFinance/>, performance:<ManagerPerformance/> };
  return (
    <SidebarLayout nav={nav} active={screen} onNav={(key) => setScreen(key as ManagerScreen)} title={titles[screen]||"Manager"} badge="Tea Season Active" user={{ initials:"FM", name:"Factory Manager", role:"Factory Manager" }} role="Factory Manager">
      {screens[screen]}
    </SidebarLayout>
  );
};
