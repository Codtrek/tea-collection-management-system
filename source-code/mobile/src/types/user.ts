export type Role =
  | 'estate_owner'
  | 'estate_manager'
  | 'collection_agent'
  | 'receiving_officer'
  | 'factory_admin'
  | 'factory_officer'
  | 'factory_manager'
  | 'employee';

export const ROLE_LABELS: Record<Role, string> = {
  estate_owner: 'Tea Estate Owner',
  estate_manager: 'Tea Estate Manager',
  collection_agent: 'Tea Collection Agent',
  receiving_officer: 'Tea Receiving Officer',
  factory_admin: 'Factory Administrator',
  factory_officer: 'Factory Officer',
  factory_manager: 'Factory Manager',
  employee: 'Employee',
};

export type User = {
  id: string;
  name: string;
  phone: string;
  role: Role;
};
