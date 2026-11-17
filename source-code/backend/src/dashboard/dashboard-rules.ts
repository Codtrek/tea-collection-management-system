/**
 * Dashboard (Dashboard-Addendum) — the pure rules: who sees which section, which "Needs your
 * action" item, in what order, and the small counts read off lists other services already build.
 * No report figure is calculated here: kg, Rs., shares and trends are read from the Collection,
 * Leaf Purchase and Expense reports as they are. Tested in dashboard-rules.spec.ts.
 */
import type { ModuleKey, PermissionLevel } from '../admin/admin-map';
import type { PublicAuditEntry } from '../audit/audit-map';
import type { PublicCollection } from '../collections/collection-map';
import type { PublicBoard } from '../dispatch/dispatch-map';
import type { PublicRequest } from '../fertilizer/fertilizer-map';

export type Perms = Partial<Record<ModuleKey, PermissionLevel>>;

const ORDER: PermissionLevel[] = ['none', 'view', 'edit', 'approve'];

export function meets(
  perms: Perms,
  module: ModuleKey,
  needed: Exclude<PermissionLevel, 'none'>,
): boolean {
  return ORDER.indexOf(perms[module] ?? 'none') >= ORDER.indexOf(needed);
}

/* ── Sections ── */

/**
 * The three questions the page answers, and for whom: "Today" is the floor's view (Officer,
 * Manager), "This month" the money view (Manager, Administrator). Inside a section every figure
 * still needs `view` on the module that owns it, so a factory narrowing a role in the
 * permissions matrix narrows its dashboard too.
 */
export const SECTION_ROLES = {
  today: ['Officer', 'Manager'],
  month: ['Manager', 'Administrator'],
} as const;

export type Section = keyof typeof SECTION_ROLES;

export function showsSection(role: string, section: Section): boolean {
  return (SECTION_ROLES[section] as readonly string[]).includes(role);
}

/** The module each figure belongs to (view is enough to see it). */
export const FIGURE_MODULE = {
  leafToday: 'collection',
  grading: 'collection',
  agents: 'dispatch',
  fertilizerToday: 'fertilizer',
  intake: 'reports',
  leafPurchase: 'reports',
  expenses: 'expenses',
  payroll: 'payroll',
  charts: 'reports',
} as const satisfies Record<string, ModuleKey>;

export type Figure = keyof typeof FIGURE_MODULE;

export function showsFigure(perms: Perms, figure: Figure): boolean {
  return meets(perms, FIGURE_MODULE[figure], 'view');
}

/* ── Needs your action ── */

export type ActionKey =
  | 'payrollDue'
  | 'settlementsToProcess'
  | 'salaryAdvances'
  | 'fertilizerToDecide'
  | 'fertilizerManager'
  | 'gradingCorrections'
  | 'payChanges'
  | 'holidayRequests'
  | 'expiredStock'
  | 'staleAllocations'
  | 'ungradedOld'
  | 'employeesNoBank'
  | 'estatesNoBank';

/**
 * Who may ACT on each item — the permission the action's own page checks — and its urgency
 * (lower first): money that is blocked or due, then decisions people wait on, then stock,
 * then data fixes.
 */
export const ACTION_RULES: Record<
  ActionKey,
  {
    module: ModuleKey;
    level: Exclude<PermissionLevel, 'none'>;
    urgency: number;
  }
> = {
  payrollDue: { module: 'payroll', level: 'edit', urgency: 10 },
  settlementsToProcess: { module: 'estateOwners', level: 'edit', urgency: 11 },
  salaryAdvances: { module: 'advances', level: 'approve', urgency: 20 },
  fertilizerToDecide: {
    module: 'fertilizerApproval',
    level: 'approve',
    urgency: 21,
  },
  fertilizerManager: {
    module: 'fertilizerManagerApproval',
    level: 'approve',
    urgency: 22,
  },
  gradingCorrections: {
    module: 'gradingApproval',
    level: 'approve',
    urgency: 23,
  },
  payChanges: { module: 'payRates', level: 'approve', urgency: 24 },
  holidayRequests: { module: 'holidayCalendar', level: 'approve', urgency: 25 },
  staleAllocations: { module: 'fertilizer', level: 'edit', urgency: 30 },
  expiredStock: { module: 'fertilizer', level: 'edit', urgency: 31 },
  ungradedOld: { module: 'grading', level: 'edit', urgency: 40 },
  employeesNoBank: { module: 'employees', level: 'approve', urgency: 50 },
  estatesNoBank: { module: 'estateOwners', level: 'edit', urgency: 51 },
};

export function canAct(perms: Perms, key: ActionKey): boolean {
  const r = ACTION_RULES[key];
  return meets(perms, r.module, r.level);
}

export interface ActionItem {
  key: ActionKey;
  count: number;
  label: string;
  /** the page listing exactly these `count` records */
  href: string;
  urgency: number;
}

/** Only items the user may act on, never a zero, most urgent first. */
export function needsAction(
  candidates: Omit<ActionItem, 'urgency'>[],
  perms: Perms,
): ActionItem[] {
  return candidates
    .filter((c) => c.count > 0 && canAct(perms, c.key))
    .map((c) => ({ ...c, urgency: ACTION_RULES[c.key].urgency }))
    .sort((a, b) => a.urgency - b.urgency || b.count - a.count);
}

export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/* ── Quick actions ── */

export interface QuickAction {
  key: string;
  label: string;
  /** a page, or `#needs-action` (the list at the top of the dashboard) */
  href: string;
}

/**
 * At most three, the ones each role's day starts with. Each still needs the permission its page
 * checks, so a narrowed role loses the button with the page.
 */
const QUICK_ACTIONS: (QuickAction & {
  roles: readonly string[];
  module: ModuleKey;
  level: Exclude<PermissionLevel, 'none'>;
  /** only while "Needs your action" has something in it */
  needsItems?: boolean;
})[] = [
  {
    key: 'logException',
    label: 'Log collection exception',
    href: '/collections/new',
    roles: ['Officer'],
    module: 'collection',
    level: 'edit',
  },
  {
    key: 'logFertilizerRequest',
    label: 'Log phoned-in fertilizer request',
    href: '/fertilizer/requests/new',
    roles: ['Officer'],
    module: 'fertilizer',
    level: 'edit',
  },
  {
    key: 'markAttendance',
    label: 'Mark attendance',
    href: '/employees/attendance/entry',
    roles: ['Officer'],
    module: 'attendance',
    level: 'edit',
  },
  {
    key: 'reviewApprovals',
    label: 'Review approvals',
    href: '#needs-action',
    roles: ['Manager', 'Administrator'],
    module: 'dashboard',
    level: 'view',
    needsItems: true,
  },
  {
    key: 'prepareSettlements',
    label: 'Prepare settlements',
    href: '/estates/settlements/process',
    roles: ['Manager', 'Administrator'],
    module: 'estateOwners',
    level: 'edit',
  },
];

export function quickActions(
  role: string,
  perms: Perms,
  actionCount: number,
): QuickAction[] {
  return QUICK_ACTIONS.filter(
    (a) =>
      a.roles.includes(role) &&
      meets(perms, a.module, a.level) &&
      (!a.needsItems || actionCount > 0),
  )
    .slice(0, 3)
    .map(({ key, label, href }) => ({ key, label, href }));
}

/* ── Counts read off existing lists (each mirrors its page's own filter) ── */

/** A delivery at the factory, waiting to be graded — what grading works on (status Collected). */
export function waitingForGrading(c: PublicCollection): boolean {
  return c.status === 'Collected' && !c.graded;
}

/** Collection list `?grade=Ungraded&status=Collected&date=` — today's deliveries waiting. */
export function ungradedOn(rows: PublicCollection[], date: string): number {
  return rows.filter((c) => waitingForGrading(c) && c.date === date).length;
}

/** Collection list `?grade=Ungraded&status=Collected&olderThan=N` — dated N or more days ago. */
export function ungradedOlderThan(
  rows: PublicCollection[],
  today: string,
  days: number,
): number {
  const cutoff = addDays(today, -days);
  return rows.filter((c) => waitingForGrading(c) && c.date <= cutoff).length;
}

export interface AgentCounts {
  onRoute: number;
  notStarted: number;
  absent: number;
  covering: number;
  completed: number;
  /** agents scheduled today (every board row but "Not scheduled") */
  scheduled: number;
}

/** The dispatch board's own statuses, counted. */
export function agentCounts(board: PublicBoard): AgentCounts {
  const n = (s: string) => board.agents.filter((a) => a.status === s).length;
  return {
    onRoute: n('On route'),
    notStarted: n('Not started'),
    absent: n('Absent'),
    covering: n('Covering'),
    completed: n('Completed'),
    scheduled: board.agents.filter((a) => a.status !== 'Not scheduled').length,
  };
}

export interface FertilizerToday {
  done: number;
  failed: number;
  pending: number;
  total: number;
}

/** A delivery attempt scheduled `today` and not cancelled — the queue's `?scope=today`. */
export function scheduledOn(r: PublicRequest, today: string): boolean {
  return (
    !!r.attempt && !r.attempt.cancelled && r.attempt.scheduledDate === today
  );
}

export function fertilizerToday(
  requests: PublicRequest[],
  today: string,
): FertilizerToday {
  const rows = requests.filter((r) => scheduledOn(r, today));
  const done = rows.filter(
    (r) =>
      r.attempt!.outcome === 'delivered' || r.attempt!.outcome === 'partial',
  ).length;
  const failed = rows.filter((r) => r.attempt!.outcome === 'failed').length;
  return {
    done,
    failed,
    pending: rows.length - done - failed,
    total: rows.length,
  };
}

/* ── Recent activity ── */

/** The audit trail's module label → the permission module whose `view` lets a role see it. */
export const AUDIT_MODULE_PERMISSION: Record<string, ModuleKey> = {
  Collection: 'collection',
  'Estate Owner': 'estateOwners',
  Fertilizer: 'fertilizer',
  Employee: 'employees',
  Reports: 'reports',
  Dispatch: 'dispatch',
  Holidays: 'holidayCalendar',
  Performance: 'performance',
  Administration: 'administration',
};

/** The newest `limit` audit entries from modules the role can view (unknown modules: Administrator only). */
export function visibleActivity(
  entries: PublicAuditEntry[],
  perms: Perms,
  limit = 10,
): PublicAuditEntry[] {
  return entries
    .filter((e) =>
      meets(
        perms,
        AUDIT_MODULE_PERMISSION[e.module] ?? 'administration',
        'view',
      ),
    )
    .slice(0, limit);
}

/* ── Dates (factory calendar, YYYY-MM-DD) ── */

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function monthName(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' })} ${y}`;
}
