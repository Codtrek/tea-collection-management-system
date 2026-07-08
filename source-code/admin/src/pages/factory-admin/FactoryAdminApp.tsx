import { useState } from 'react'
import { SidebarLayout} from '../../layouts/SidebarLayout'
import { FactoryDashboard } from './FactoryDashboard'
import { FactoryRegistration } from './FactoryRegistration'
import { FactoryTeaCollection } from './FactoryTeaCollection'
import { FactoryFertilizer } from './FactoryFertilizer'
import { type LogoutProps, type FactoryAdminScreen } from '../../types'

export const FactoryAdminApp = ({ onLogout: _onLogout }: LogoutProps) => {
  const [screen, setScreen] = useState<FactoryAdminScreen>("dashboard");
  const nav = [
    { label:"Overview",   items:[{ key:"dashboard",      icon:"dashboard", label:"Factory Dashboard" }] },
    { label:"Setup",      items:[{ key:"registration",   icon:"factory",   label:"Factory Registration" }] },
    { label:"Operations", items:[{ key:"tea-collection", icon:"scale",     label:"Tea Leaves Collection" }, { key:"fertilizer", icon:"seeding", label:"Fertilizer Inventory" }] },
  ];
  const titles = { dashboard:"Factory Dashboard", registration:"Factory Registration", "tea-collection":"Tea Leaves Collection", fertilizer:"Fertilizer Inventory" };
  const screens = { dashboard:<FactoryDashboard/>, registration:<FactoryRegistration/>, "tea-collection":<FactoryTeaCollection/>, fertilizer:<FactoryFertilizer/> };
  return (
    <SidebarLayout nav={nav} active={screen} onNav={(key) => setScreen(key as FactoryAdminScreen)} title={titles[screen]||"Factory Admin"} badge="Tea Season Active" user={{ initials:"FA", name:"Factory Admin", role:"Factory Administrator" }} role="Factory Admin">
      {screens[screen]}
    </SidebarLayout>
  );
};
