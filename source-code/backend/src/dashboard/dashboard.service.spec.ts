import { DashboardService, type DashboardActor } from './dashboard.service';

/*
  The dashboard only reads other services. These fakes return the shapes those services return;
  the tests check that each figure is the service's own number (so it equals the linked list),
  that the role's permissions decide what is computed at all, and that "today" is Colombo's.
*/

const DEFAULTS: Record<string, Record<string, string>> = {
  Officer: {
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
  },
  Manager: {
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
    administration: 'none',
  },
  Administrator: new Proxy<Record<string, string>>(
    {},
    {
      get: (_t, k) =>
        k === 'grading' ||
        k === 'gradingApproval' ||
        k === 'fertilizerApproval' ||
        k === 'fertilizerManagerApproval' ||
        k === 'expenses'
          ? 'view'
          : 'approve',
    },
  ),
};

function collectionReport(kg: number, deliveries: number) {
  return {
    period: { label: 'November 2026 so far (1–17 Nov)' },
    tolerancePct: 5,
    cards: {
      factoryKg: {
        value: kg,
        previous: 900,
        changePct: 11.1,
        lastYear: null,
        yoyPct: null,
      },
      deliveries: { value: deliveries, ungraded: 0 },
      superShare: { value: 60 },
      weightDiff: { overTolerance: [{ id: 'X' }, { id: 'Y' }] },
    },
    trend: {
      points: [
        {
          key: '2026-11-01',
          label: '1 Nov',
          kg: 10,
          deliveries: 1,
          partial: false,
        },
        {
          key: '2026-11-02',
          label: '2 Nov',
          kg: 20,
          deliveries: 2,
          partial: true,
        },
      ],
    },
    byRoute: [{ id: 1, name: 'Route A', kg: 30, deliveries: 3 }],
  };
}

function build(role: DashboardActor['role'], perms = DEFAULTS[role]) {
  const calls: string[] = [];
  const spy =
    <T>(name: string, value: T) =>
    (...args: unknown[]) => {
      calls.push(
        `${name}(${JSON.stringify(args.filter((a) => !(a instanceof Date)))})`,
      );
      return Promise.resolve(value);
    };
  const report = jest.fn((q: { from?: string; month?: string }) => {
    calls.push(`collectionReport(${JSON.stringify(q)})`);
    return Promise.resolve(
      q.from === '2026-11-10'
        ? collectionReport(800, 4)
        : collectionReport(1000, 5),
    );
  });
  const services = {
    access: {
      levelFor: (_r: string, m: string) => Promise.resolve(perms[m] ?? 'none'),
    },
    collectionReport: { report },
    leafPurchase: {
      report: spy('leafPurchase', {
        cards: {
          leafValue: { value: 185000, changePct: 3 },
          pricePerKg: { value: 185 },
        },
      }),
    },
    finance: {
      expenseReport: spy('expenses', {
        cards: { total: { value: 420000, changePct: -2 } },
      }),
    },
    dispatch: {
      board: spy('board', {
        agents: [
          { status: 'On route' },
          { status: 'Absent' },
          { status: 'Not scheduled' },
        ],
      }),
    },
    fertilizerView: {
      list: spy('fertilizerList', [
        { status: 'Requested', staleCommittedKg: 0, attempt: null },
        { status: 'Requested', staleCommittedKg: 5, attempt: null },
        {
          status: 'Awaiting manager approval',
          staleCommittedKg: 0,
          attempt: null,
        },
        {
          status: 'Out for delivery',
          staleCommittedKg: 0,
          attempt: {
            scheduledDate: '2026-11-17',
            outcome: null,
            cancelled: false,
          },
        },
      ]),
    },
    fertilizer: {
      expiryAlerts: spy('expiry', { summary: { expired: { count: 2 } } }),
    },
    fertilizerDeliveries: { reconcile: spy('reconcile', undefined) },
    collections: {
      findAll: spy('collections', [
        { id: 'A', date: '2026-11-17', status: 'Collected', graded: false },
        { id: 'B', date: '2026-11-01', status: 'Collected', graded: false },
      ]),
    },
    grading: {
      pendingCorrectionDeliveryIds: spy('corrections', [
        'GV-1',
        'HT-2',
        'MR-3',
      ]),
    },
    advances: { list: spy('advances', { tabCounts: { decide: 4 } }) },
    payroll: {
      month: jest.fn(
        (q: { month: string; status?: string; issues?: string[] }) => {
          calls.push(`payroll(${JSON.stringify(q)})`);
          return Promise.resolve({
            total: q.issues ? 2 : q.status ? 9 : 11,
            readiness: {
              status:
                q.month === '2026-10' ? 'Ready to process' : 'In progress',
            },
          });
        },
      ),
    },
    payChanges: {
      list: spy('payChanges', [
        { status: 'pending', approval: { canDecide: true } },
        { status: 'pending', approval: { canDecide: false } },
        { status: 'approved', approval: { canDecide: false } },
      ]),
    },
    holidays: { year: spy('holidays', { pending: [{}, {}] }) },
    settlements: {
      list: jest.fn((q: { noBank?: boolean }) => {
        calls.push(`settlements(${JSON.stringify(q)})`);
        return Promise.resolve({ total: q.noBank ? 1 : 3 });
      }),
    },
    audit: {
      list: spy('audit', [
        { id: '1', module: 'Administration' },
        { id: '2', module: 'Collection' },
        { id: '3', module: 'Employee' },
      ]),
    },
  };
  const s = services as unknown as Record<string, never>;
  const service = new DashboardService(
    s.access,
    s.collectionReport,
    s.leafPurchase,
    s.finance,
    s.dispatch,
    s.fertilizerView,
    s.fertilizer,
    s.fertilizerDeliveries,
    s.collections,
    s.grading,
    s.advances,
    s.payroll,
    s.payChanges,
    s.holidays,
    s.settlements,
    s.audit,
  );
  const actor: DashboardActor = { name: 'T', role, sub: 1 };
  return { service, actor, calls };
}

// 00:30 on 17 Nov in Colombo is still 16 Nov in UTC
const NOW = new Date('2026-11-16T19:00:00Z');

describe('DashboardService.summary', () => {
  it('"today" is the Colombo date, not the UTC one', async () => {
    const { service, actor, calls } = build('Officer');
    const s = await service.summary(actor, NOW);
    expect(s.today).toBe('2026-11-17');
    expect(s.month).toBe('2026-11');
    expect(calls).toContain(
      'collectionReport({"from":"2026-11-17","to":"2026-11-17"})',
    );
    // same weekday last week
    expect(calls).toContain(
      'collectionReport({"from":"2026-11-10","to":"2026-11-10"})',
    );
  });

  it('Officer: Today, no This month; each figure is the source service’s own number', async () => {
    const { service, actor } = build('Officer');
    const s = await service.summary(actor, NOW);
    expect(s.monthView).toBeNull();
    expect(s.todayView?.leaf).toMatchObject({
      kg: 1000,
      deliveries: 5,
      compareKg: 800,
      changePct: 25,
      compareDate: '2026-11-10',
      href: '/reports/collection?from=2026-11-17&to=2026-11-17',
    });
    expect(s.todayView?.grading).toMatchObject({
      waiting: 1,
      waitingHref:
        '/collections?grade=Ungraded&status=Collected&date=2026-11-17',
      overTolerance: 2,
    });
    expect(s.todayView?.agents).toMatchObject({
      onRoute: 1,
      absent: 1,
      scheduled: 2,
    });
    expect(s.todayView?.fertilizer).toMatchObject({ total: 1, pending: 1 });
  });

  it('Officer: the actions an Officer can take, with counts from the linked lists', async () => {
    const { service, actor, calls } = build('Officer');
    const s = await service.summary(actor, NOW);
    expect(s.actions.map((a) => [a.key, a.count, a.href])).toEqual([
      ['payrollDue', 9, '/employees/payroll?month=2026-10&status=Pending'],
      [
        'settlementsToProcess',
        3,
        '/estates/settlements?month=all&status=Pending',
      ],
      ['salaryAdvances', 4, '/employees/advances'],
      ['fertilizerToDecide', 2, '/fertilizer/requests?status=Requested'],
      ['staleAllocations', 1, '/fertilizer/requests?tab=all&scope=stale'],
      ['expiredStock', 2, '/fertilizer/alerts#expired'],
      [
        'ungradedOld',
        1,
        '/collections?grade=Ungraded&status=Collected&olderThan=7',
      ],
      [
        'estatesNoBank',
        1,
        '/estates/settlements?month=all&status=Pending&bank=missing',
      ],
    ]);
    // the queue's own read path: reconcile, then list
    expect(calls.indexOf('reconcile([])')).toBeLessThan(
      calls.indexOf('fertilizerList([])'),
    );
    // never computed for an Officer
    expect(calls.some((c) => c.startsWith('corrections'))).toBe(false);
    expect(calls.some((c) => c.startsWith('payChanges'))).toBe(false);
    expect(calls.some((c) => c.startsWith('holidays'))).toBe(false);
    expect(calls.some((c) => c.startsWith('leafPurchase'))).toBe(false);
  });

  it('Manager: Today and This month; approvals only a Manager gives', async () => {
    const { service, actor } = build('Manager');
    const s = await service.summary(actor, NOW);
    expect(s.todayView).not.toBeNull();
    expect(s.monthView).toMatchObject({
      intake: {
        kg: 1000,
        compareKg: 900,
        superShare: 60,
        href: '/reports/collection?thisMonth=1',
      },
      leafPurchase: { valueRs: 185000, rsPerKg: 185 },
      expenses: { totalRs: 420000 },
      payroll: {
        status: 'In progress',
        lastMonth: '2026-10',
        lastMonthStatus: 'Ready to process',
      },
    });
    expect(s.actions.map((a) => [a.key, a.count])).toEqual([
      ['fertilizerManager', 1],
      ['gradingCorrections', 3],
    ]);
    expect(s.quickActions.map((a) => a.label)).toEqual(['Review approvals']);
  });

  it('Administrator: This month without Today; pay changes it can decide, holidays', async () => {
    const { service, actor } = build('Administrator');
    const s = await service.summary(actor, NOW);
    expect(s.todayView).toBeNull();
    expect(s.monthView).not.toBeNull();
    const keys = s.actions.map((a) => a.key);
    expect(keys).toContain('payChanges');
    expect(s.actions.find((a) => a.key === 'payChanges')?.count).toBe(1);
    expect(s.actions.find((a) => a.key === 'holidayRequests')?.count).toBe(2);
    expect(s.actions.find((a) => a.key === 'employeesNoBank')).toMatchObject({
      count: 2,
      href: '/employees/payroll?month=2026-10&issues=noBank',
    });
    expect(keys).not.toContain('gradingCorrections');
  });

  it('charts: this month by day with last month aligned, and by route', async () => {
    const { service, actor, calls } = build('Manager');
    const s = await service.summary(actor, NOW);
    expect(calls).toContain('collectionReport({"month":"2026-10"})');
    expect(s.charts?.daily[1]).toMatchObject({
      label: '2 Nov',
      kg: 20,
      partial: true,
      lastMonthKg: 20,
    });
    expect(s.charts?.byRoute).toEqual([
      { id: 1, name: 'Route A', kg: 30, deliveries: 3 },
    ]);
    expect(s.charts?.lastMonthLabel).toBe('October 2026');
  });

  it('activity: only modules the role can view', async () => {
    const off = build('Officer');
    expect(
      (await off.service.summary(off.actor, NOW)).activity.map((a) => a.id),
    ).toEqual(['2', '3']);
    const admin = build('Administrator');
    expect(
      (await admin.service.summary(admin.actor, NOW)).activity.map((a) => a.id),
    ).toEqual(['1', '2', '3']);
  });

  it('a role narrowed in the matrix loses the figure and never loads it', async () => {
    const { service, actor, calls } = build('Officer', {
      ...DEFAULTS.Officer,
      dispatch: 'none',
    });
    const s = await service.summary(actor, NOW);
    expect(s.todayView?.agents).toBeUndefined();
    expect(calls.some((c) => c.startsWith('board'))).toBe(false);
  });

  it('a zero count is never returned', async () => {
    const { service, actor } = build('Manager', { ...DEFAULTS.Manager });
    const s = await service.summary(actor, NOW);
    expect(s.actions.every((a) => a.count > 0)).toBe(true);
  });
});
