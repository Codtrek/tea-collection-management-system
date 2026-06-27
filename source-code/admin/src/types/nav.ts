import { type NavigateFunction } from "react-router-dom";
import { type Role } from "./auth";

export interface NavigateProps {
  onNavigate: NavigateFunction;
}

export interface LogoutProps {
  onLogout: () => void;
}

export interface LoginProps {
  onNavigate: NavigateFunction;
  onLogin: (r: Role) => void;
}

export interface NavItem {
  key: string;
  icon: string;
  label: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export interface SidebarUser {
  initials: string;
  name: string;
  role: string;
}

export interface SidebarProps {
  nav: NavSection[];
  active: string;
  onNav: (key: string) => void;
  title: string;
  badge?: string;
  user: SidebarUser;
  role: string;
  children: React.ReactNode;
}