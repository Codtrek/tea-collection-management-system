/**
 * The ONE source of truth for HR job titles (`employees.role`). The registration/edit forms
 * fetch this list (GET /employees/roles) instead of hardcoding it, and the DTOs validate
 * against it. Dispatch decides "who is a collection agent" from AGENT_JOB_ROLE — never
 * compare against the literal string anywhere else.
 */
export const AGENT_JOB_ROLE = 'Tea Collecting Agent';

export const EMPLOYEE_ROLES: readonly string[] = [
  'Factory Officer',
  'Factory Manager',
  'Machine Operator',
  'Driver',
  'Receiving Officer',
  AGENT_JOB_ROLE,
];

export const isAgentRole = (role: string | null | undefined): boolean =>
  role === AGENT_JOB_ROLE;
