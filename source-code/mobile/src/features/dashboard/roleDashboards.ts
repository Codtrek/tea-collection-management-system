import type { Ionicons } from '@expo/vector-icons';

import type { Role } from '@/types/user';

type DashboardItem = { icon: keyof typeof Ionicons.glyphMap; label: string; route?: string };

type RoleDashboard = {
  greetingRole: string;
  items: DashboardItem[];
};

export const ROLE_DASHBOARDS: Record<Role, RoleDashboard> = {
  estate_owner: {
    greetingRole: 'Estate Owner',
    items: [
      { icon: 'leaf-outline', label: 'Create Pickup Request', route: '/(app)/pickup' },
      { icon: 'map-outline', label: 'View Route Availability' },
      { icon: 'checkmark-done-outline', label: 'Confirm Weight on Collector Device' },
      { icon: 'flask-outline', label: 'Request Fertilizer' },
      { icon: 'cash-outline', label: 'Request Advance' },
      { icon: 'document-text-outline', label: 'View Payment Statements', route: '/(app)/payments' },
    ],
  },
  estate_manager: {
    greetingRole: 'Estate Manager',
    items: [
      { icon: 'business-outline', label: 'Estate Overview' },
      { icon: 'people-outline', label: 'Estate Employees' },
      { icon: 'map-outline', label: 'View Route Availability' },
    ],
  },
  collector: {
    greetingRole: 'Collection Agent',
    items: [
      { icon: 'navigate-outline', label: "Today's Route", route: '/(app)/routes' },
      { icon: 'play-outline', label: 'Start Route', route: '/(app)/routes' },
      { icon: 'list-outline', label: 'Pickup Requests', route: '/(app)/pickup' },
      { icon: 'speedometer-outline', label: 'Enter Weight & Capture Photo', route: '/(app)/collection' },
      { icon: 'create-outline', label: 'Manual Collection Entry', route: '/(app)/collection' },
    ],
  },
  receiving_officer: {
    greetingRole: 'Receiving Officer',
    items: [
      { icon: 'speedometer-outline', label: 'Receive & Re-weigh Tea', route: '/(app)/collection' },
      { icon: 'ribbon-outline', label: 'Assign Tea Grade', route: '/(app)/collection' },
      { icon: 'alert-circle-outline', label: 'Weight Mismatch Complaints' },
    ],
  },
  factory_admin: {
    greetingRole: 'Factory Administrator',
    items: [
      { icon: 'map-outline', label: 'Manage Routes', route: '/(app)/routes' },
      { icon: 'car-outline', label: 'Trucks & Drivers' },
      { icon: 'calculator-outline', label: 'Monthly Payment Calculation', route: '/(app)/payments' },
      { icon: 'card-outline', label: 'Bank Payment File Export' },
    ],
  },
  factory_officer: {
    greetingRole: 'Factory Officer',
    items: [
      { icon: 'map-outline', label: 'Route Dashboard', route: '/(app)/routes' },
      { icon: 'flask-outline', label: 'Fertilizer Requests' },
      { icon: 'alert-circle-outline', label: 'Complaints' },
    ],
  },
  factory_manager: {
    greetingRole: 'Factory Manager',
    items: [
      { icon: 'stats-chart-outline', label: 'Factory Overview' },
      { icon: 'checkmark-circle-outline', label: 'Approve Advances' },
      { icon: 'bar-chart-outline', label: 'Reports' },
    ],
  },
  employee: {
    greetingRole: 'Employee',
    items: [
      { icon: 'time-outline', label: 'Salary History' },
      { icon: 'document-text-outline', label: 'Payslips' },
      { icon: 'cash-outline', label: 'Request Advance' },
    ],
  },
};
