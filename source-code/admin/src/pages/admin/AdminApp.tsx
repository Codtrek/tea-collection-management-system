import { useState } from 'react';
import { Card } from '../../components/ui/Card'
import { SidebarLayout} from '../../layouts/SidebarLayout'
import { AdminDashboard } from './AdminDashboard';
import { type AdminScreen, type LogoutProps } from '../../types'
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const AdminApp = ({ onLogout: _onLogout } :LogoutProps) => {
  const [screen, setScreen] = useState<AdminScreen>("dashboard");
  const nav = [
    { label:"Overview", items:[{ key:"dashboard", icon:"dashboard", label:"Dashboard" }] },
    { label:"Management", items:[{ key:"factories", icon:"factory", label:"Factories" }, { key:"users", icon:"users", label:"Users" }] },
  ];
  const titles = { dashboard:"Admin Dashboard", factories:"Factory Management", users:"User Management" };
  return (
    <SidebarLayout nav={nav} active={screen} onNav={(key) => setScreen(key as AdminScreen)} title={titles[screen]||"Admin"} badge="Dev Admin Panel" user={{ initials:"DA", name:"Dev Admin", role:"System Administrator" }} role="System Admin">
      {screen === "dashboard" && <AdminDashboard />}
      {screen !== "dashboard" && <Card><div className={styles.comingSoon}>{titles[screen]} — coming soon</div></Card>}
    </SidebarLayout>
  );
};
