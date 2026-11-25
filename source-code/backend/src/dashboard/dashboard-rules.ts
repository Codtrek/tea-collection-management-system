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

/* ── Needs your action: the work queue ── */

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
 * urgent: blocks money moving, or is overdue · dueSoon: due this cycle · toDecide: someone is
 * waiting on a decision. Empty groups are never shown.
 */
export type ActionGroup = 'urgent' | 'dueSoon' | 'toDecide';
export const GROUP_ORDER: ActionGroup[] = ['urgent', 'dueSoon', 'toDecide'];

/**
 * Who may ACT on each item — the permission the action's own page checks — its group, its order
 * inside the group (lower first; a blocker before what it blocks) and the button's word. Every
 * action only opens the filtered list: nothing is decided or run from the dashboard.
 */
export const ACTION_RULES: Record<
  ActionKey,
  {
    module: ModuleKey;
    level: Exclude<PermissionLevel, 'none'>;
    group: ActionGroup;
    urgency: number;
    action: string;
  }
> = {
  estatesNoBank: {
    module: 'estateOwners',
    level: 'edit',
    group: 'urgent',
    urgency: 10,
    action: 'Fix bank details',
  },
  payrollDue: {
    module: 'payroll',
    level: 'edit',
    group: 'urgent',
    urgency: 11,
    action: 'Review payroll',
  },
  employeesNoBank: {
    module: 'employees',
    level: 'approve',
    group: 'urgent',
    urgency: 12,
    action: 'Fix bank details',
  },
  ungradedOld: {
    module: 'grading',
    level: 'edit',
    group: 'urgent',
    urgency: 13,
    action: 'Grade deliveries',
  },
  // processing a settlement run needs Approve (write permissions); Edit only prepares drafts
  settlementsToProcess: {
    module: 'estateOwners',
    level: 'approve',
    group: 'dueSoon',
    urgency: 20,
    action: 'Review settlements',
  },
  staleAllocations: {
    module: 'fertilizer',
    level: 'edit',
    group: 'dueSoon',
    urgency: 21,
    action: 'Review requests',
  },
  expiredStock: {
    module: 'fertilizer',
    level: 'edit',
    group: 'dueSoon',
    urgency: 22,
    action: 'Write off',
  },
  salaryAdvances: {
    module: 'advances',
    level: 'approve',
    group: 'toDecide',
    urgency: 30,
    action: 'Review',
  },
  fertilizerToDecide: {
    module: 'fertilizerApproval',
    level: 'approve',
    group: 'toDecide',
    urgency: 31,
    action: 'Review',
  },
  fertilizerManager: {
    module: 'fertilizerManagerApproval',
    level: 'approve',
    group: 'toDecide',
    urgency: 32,
    action: 'Review',
  },
  gradingCorrections: {
    module: 'gradingApproval',
    level: 'approve',
    group: 'toDecide',
    urgency: 33,
    action: 'Review',
  },
  payChanges: {
    module: 'payRates',
    level: 'approve',
    group: 'toDecide',
    urgency: 34,
    action: 'Review',
  },
  holidayRequests: {
    module: 'holidayCalendar',
    level: 'approve',
    group: 'toDecide',
    urgency: 35,
    action: 'Review',
  },
};

export function canAct(perms: Perms, key: ActionKey): boolean {
  const r = ACTION_RULES[key];
  return meets(perms, r.module, r.level);
}

export interface ActionItem {
  key: ActionKey;
  count: number;
  label: string;
  /** why it matters or what is holding it, from the same list; null when the label says it all */
  reason: string | null;
  /** the page listing exactly these `count` records */
  href: string;
  group: ActionGroup;
  urgency: number;
  /** the button's word — it only opens `href` */
  action: string;
  /** this item holds up another one (e.g. missing bank details → settlements) */
  blocks?: ActionKey;
  /** the item can't move until something else is fixed (e.g. no transport amount) */
  blocked?: boolean;
}

export type ActionCandidate = Omit<ActionItem, 'urgency' | 'group' | 'action'> &
  Partial<Pick<ActionItem, 'action'>>;

/** Only items the user may act on, never a zero, grouped, most urgent first. */
export function needsAction(
  candidates: ActionCandidate[],
  perms: Perms,
): ActionItem[] {
  return candidates
    .filter((c) => c.count > 0 && canAct(perms, c.key))
    .map((c) => {
      const r = ACTION_RULES[c.key];
      return {
        ...c,
        group: r.group,
        urgency: r.urgency,
        action: c.action ?? r.action,
      };
    })
    .sort(
      (a, b) =>
        GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) ||
        a.urgency - b.urgency ||
        b.count - a.count,
    );
}

export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * The page's one primary button: the role's most urgent item's action (it opens that item's
 * list). No queue, no primary button. "Review approvals" counts the To decide items.
 */
export function primaryAction(
  items: ActionItem[],
): { label: string; href: string; key: ActionKey } | null {
  const top = items[0];
  return top ? { label: top.action, href: top.href, key: top.key } : null;
}

export function toDecideCount(items: ActionItem[]): number {
  return items.filter((i) => i.group === 'toDecide').length;
}

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** `01 Jul 2026` — the portal's one date format (admin/src/lib/format.ts formatDate). */
export function formatDay(date: string): string {
  const [y, m, d] = date.slice(0, 10).split('-');
  return `${d} ${MONTHS_SHORT[Number(m) - 1]} ${y}`;
}

/** `Rs. 1,245,600`, cents only when there are any — the portal's formatCurrency. */
export function formatRs(n: number): string {
  const cents = Math.round(n * 100) % 100 !== 0;
  return `Rs. ${n.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/** The earliest of some dates (YYYY-MM-DD…), or null. */
export function oldest(dates: (string | null | undefined)[]): string | null {
  const ds = dates.filter((d): d is string => !!d).sort();
  return ds[0] ?? null;
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
