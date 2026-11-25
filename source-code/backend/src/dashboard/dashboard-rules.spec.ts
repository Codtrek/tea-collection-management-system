import type { PublicAuditEntry } from '../audit/audit-map';
import type { PublicCollection } from '../collections/collection-map';
import type { PublicBoard } from '../dispatch/dispatch-map';
import type { PublicRequest } from '../fertilizer/fertilizer-map';
import {
  type ActionCandidate,
  type Perms,
  addDays,
  agentCounts,
  canAct,
  fertilizerToday,
  formatDay,
  formatRs,
  monthName,
  needsAction,
  oldest,
  previousMonth,
  primaryAction,
  toDecideCount,
  showsFigure,
  showsSection,
  ungradedOlderThan,
  ungradedOn,
  visibleActivity,
} from './dashboard-rules';

// the seeded default matrix (seed.ts PERMISSION_MATRIX) for the three portal roles
const OFFICER: Perms = {
  dashboard: 'view',
  collection: 'edit',
  fertilizer: 'edit',
  estateOwners: 'edit',
  payroll: 'edit',
  advances: 'approve',
  employees: 'view',
  reports: 'edit',
  expenses: 'edit',
  dispatch: 'edit',
  grading: 'edit',
  gradingApproval: 'view',
  fertilizerApproval: 'approve',
  fertilizerManagerApproval: 'view',
  holidayCalendar: 'view',
  payRates: 'none',
  administration: 'none',
};
const MANAGER: Perms = {
  dashboard: 'view',
  collection: 'view',
  fertilizer: 'view',
  estateOwners: 'view',
  payroll: 'view',
  advances: 'view',
  employees: 'view',
  reports: 'view',
  expenses: 'approve',
  dispatch: 'approve',
  grading: 'view',
  gradingApproval: 'approve',
  fertilizerApproval: 'view',
  fertilizerManagerApproval: 'approve',
  holidayCalendar: 'edit',
  payRates: 'edit',
  performance: 'edit',
  administration: 'none',
};

describe('sections by role', () => {
  it('Today is for Officer and Manager, This month for Manager and Administrator', () => {
    expect(showsSection('Officer', 'today')).toBe(true);
    expect(showsSection('Manager', 'today')).toBe(true);
    expect(showsSection('Administrator', 'today')).toBe(false);
    expect(showsSection('Officer', 'month')).toBe(false);
    expect(showsSection('Manager', 'month')).toBe(true);
    expect(showsSection('Administrator', 'month')).toBe(true);
  });

  it('each figure still needs view on its module (a narrowed role loses it)', () => {
    expect(showsFigure(MANAGER, 'agents')).toBe(true);
    expect(showsFigure({ ...MANAGER, dispatch: 'none' }, 'agents')).toBe(false);
    expect(showsFigure({}, 'leafToday')).toBe(false);
  });
});

describe('needs your action: the work queue', () => {
  const all = [
    { key: 'payrollDue', count: 12, label: 'p', reason: null, href: '/p' },
    { key: 'salaryAdvances', count: 2, label: 'a', reason: null, href: '/a' },
    {
      key: 'fertilizerToDecide',
      count: 3,
      label: 'f',
      reason: null,
      href: '/f',
    },
    {
      key: 'fertilizerManager',
      count: 1,
      label: 'm',
      reason: null,
      href: '/m',
    },
    {
      key: 'gradingCorrections',
      count: 4,
      label: 'g',
      reason: null,
      href: '/g',
    },
    { key: 'payChanges', count: 1, label: 'c', reason: null, href: '/c' },
    { key: 'ungradedOld', count: 0, label: 'u', reason: null, href: '/u' },
    { key: 'expiredStock', count: 6, label: 'x', reason: null, href: '/x' },
    {
      key: 'settlementsToProcess',
      count: 38,
      label: 's',
      reason: null,
      href: '/s',
    },
    {
      key: 'estatesNoBank',
      count: 36,
      label: 'b',
      reason: null,
      href: '/b',
      blocks: 'settlementsToProcess',
    },
  ] satisfies ActionCandidate[];

  it('only what the role may act on, never a zero; urgent, due soon, to decide; a blocker first', () => {
    const officer = needsAction([...all], OFFICER);
    expect(officer.map((i) => [i.group, i.key])).toEqual([
      ['urgent', 'estatesNoBank'],
      ['urgent', 'payrollDue'],
      // settlementsToProcess needs Approve: the Officer (Edit) only prepares drafts
      ['dueSoon', 'expiredStock'],
      ['toDecide', 'salaryAdvances'],
      ['toDecide', 'fertilizerToDecide'],
    ]);
    expect(needsAction([...all], MANAGER).map((i) => i.key)).toEqual([
      'fertilizerManager',
      'gradingCorrections',
    ]);
  });

  it('the permission is the one the action checks, read from the matrix', () => {
    expect(canAct(OFFICER, 'gradingCorrections')).toBe(false);
    expect(canAct(MANAGER, 'gradingCorrections')).toBe(true);
    expect(canAct(MANAGER, 'settlementsToProcess')).toBe(false);
    // processing needs Approve: an Officer (Edit) prepares drafts but isn't asked to process
    expect(canAct({ estateOwners: 'edit' }, 'settlementsToProcess')).toBe(
      false,
    );
    expect(canAct({ estateOwners: 'approve' }, 'settlementsToProcess')).toBe(
      true,
    );
    expect(canAct({ payRates: 'approve' }, 'payChanges')).toBe(true);
    expect(canAct(MANAGER, 'payChanges')).toBe(false);
  });

  it('every action only opens a list — its word comes from the rule unless given', () => {
    const [item] = needsAction(
      [
        {
          key: 'expiredStock',
          count: 2,
          label: 'x',
          reason: 'r',
          href: '/fertilizer/alerts#expired',
        },
      ],
      OFFICER,
    );
    expect(item).toEqual({
      key: 'expiredStock',
      count: 2,
      label: 'x',
      reason: 'r',
      href: '/fertilizer/alerts#expired',
      group: 'dueSoon',
      urgency: 22,
      action: 'Write off',
    });
    const [pay] = needsAction(
      [
        {
          key: 'payrollDue',
          count: 1,
          label: 'p',
          reason: null,
          href: '/p',
          action: 'Generate payroll',
        },
      ],
      OFFICER,
    );
    expect(pay.action).toBe('Generate payroll');
    // nothing decides money on the dashboard: advances only open their list
    expect(needsAction([all[1]], OFFICER)[0].action).toBe('Review');
  });

  it('one primary button: the top item’s action; none with an empty queue', () => {
    const officer = needsAction([...all], OFFICER);
    expect(primaryAction(officer)).toEqual({
      label: 'Fix bank details',
      href: '/b',
      key: 'estatesNoBank',
    });
    expect(primaryAction([])).toBeNull();
    expect(toDecideCount(officer)).toBe(2);
  });
});

describe('formatting shared with the portal', () => {
  it('dates as 01 Jul 2026, money as Rs. 1,245,600 (cents only when present), the oldest date', () => {
    expect(formatDay('2026-07-01')).toBe('01 Jul 2026');
    expect(formatDay('2026-11-16T22:04:17.634Z')).toBe('16 Nov 2026');
    expect(formatRs(50000)).toBe('Rs. 50,000');
    expect(formatRs(7887.5)).toBe('Rs. 7,887.50');
    expect(oldest(['2026-11-03', null, '2026-10-30', undefined])).toBe(
      '2026-10-30',
    );
    expect(oldest([])).toBeNull();
  });
});

describe('counts read off existing lists', () => {
  const c = (
    id: string,
    date: string,
    status: PublicCollection['status'],
    graded = false,
  ) => ({ id, date, status, graded }) as PublicCollection;
  const rows = [
    c('A', '2026-11-17', 'Collected'),
    c('B', '2026-11-17', 'Collected', true),
    c('C', '2026-11-17', 'Pending Agent Confirmation'),
    c('D', '2026-11-10', 'Collected'),
    c('E', '2026-11-11', 'Collected'),
    c('F', '2026-11-01', 'Submitted'),
  ];

  it('waiting for grading today = Collected, no grade lines, dated today', () => {
    expect(ungradedOn(rows, '2026-11-17')).toBe(1);
  });

  it('ungraded for more than 7 days = dated on or before today − 7', () => {
    expect(ungradedOlderThan(rows, '2026-11-17', 7)).toBe(1);
  });

  it('agents by the board’s own status', () => {
    const board = {
      agents: [
        { status: 'On route' },
        { status: 'On route' },
        { status: 'Absent' },
        { status: 'Covering' },
        { status: 'Not started' },
        { status: 'Not scheduled' },
      ],
    } as unknown as PublicBoard;
    expect(agentCounts(board)).toEqual({
      onRoute: 2,
      notStarted: 1,
      absent: 1,
      covering: 1,
      completed: 0,
      scheduled: 5,
    });
  });

  it('fertilizer deliveries scheduled today: done / failed / pending, cancelled left out', () => {
    const r = (
      scheduledDate: string,
      outcome: string | null,
      cancelled = false,
    ) =>
      ({
        attempt: { scheduledDate, outcome, cancelled },
      }) as unknown as PublicRequest;
    const out = fertilizerToday(
      [
        r('2026-11-17', 'delivered'),
        r('2026-11-17', 'partial'),
        r('2026-11-17', 'failed'),
        r('2026-11-17', null),
        r('2026-11-17', null, true),
        r('2026-11-16', null),
        { attempt: null } as unknown as PublicRequest,
      ],
      '2026-11-17',
    );
    expect(out).toEqual({ done: 2, failed: 1, pending: 1, total: 4 });
  });
});

describe('recent activity', () => {
  const e = (id: string, module: string) =>
    ({
      id,
      module,
      action: 'x',
      user: 'u',
      role: 'r',
      timestamp: '',
    }) as PublicAuditEntry;
  const entries = [
    e('1', 'Administration'),
    e('2', 'Collection'),
    e('3', 'Employee'),
    e('4', 'Performance'),
    e('5', 'Unknown'),
  ];

  it('only modules the role can view; unknown modules stay with the Administrator', () => {
    expect(visibleActivity(entries, OFFICER).map((x) => x.id)).toEqual([
      '2',
      '3',
    ]);
    expect(visibleActivity(entries, MANAGER).map((x) => x.id)).toEqual([
      '2',
      '3',
      '4',
    ]);
    expect(
      visibleActivity(entries, {
        administration: 'approve',
        collection: 'approve',
      }).map((x) => x.id),
    ).toEqual(['1', '2', '5']);
  });

  it('the newest 10 at most', () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      e(String(i), 'Collection'),
    );
    expect(visibleActivity(many, OFFICER)).toHaveLength(10);
  });
});

describe('dates', () => {
  it('days and months on the factory calendar', () => {
    expect(addDays('2026-11-03', -7)).toBe('2026-10-27');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(previousMonth('2026-01')).toBe('2025-12');
    expect(previousMonth('2026-11')).toBe('2026-10');
    expect(monthName('2026-10')).toBe('October 2026');
  });
});
