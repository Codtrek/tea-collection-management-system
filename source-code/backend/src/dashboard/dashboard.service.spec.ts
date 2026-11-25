import {
  DASHBOARD_SUMMARY_KEYS,
  DashboardService,
  type DashboardActor,
} from './dashboard.service';

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
    period: {
      label: 'November 2026 so far (1–17 Nov)',
      previous: { from: '2026-10-01', to: '2026-10-17' },
    },
    gradeSplit: { superKg: 600, normalKg: 400, superShare: 60 },
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

interface Opts {
  /** every pending settlement month has a transport version */
  transport?: boolean;
  /** this service throws */
  failAudit?: boolean;
}

function build(
  role: DashboardActor['role'],
  perms = DEFAULTS[role],
  opts: Opts = {},
) {
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
        {
          status: 'Requested',
          staleCommittedKg: 0,
          attempt: null,
          requestedDate: '2026-11-12',
        },
        {
          status: 'Requested',
          staleCommittedKg: 5,
          attempt: null,
          requestedDate: '2026-11-03',
        },
        {
          status: 'Awaiting manager approval',
          staleCommittedKg: 0,
          attempt: null,
          requestedDate: '2026-11-15',
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
      expiryAlerts: spy('expiry', {
        summary: { expired: { count: 2, kg: 1250 } },
      }),
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
    advances: {
      list: spy('advances', {
        tabCounts: { decide: 4 },
        rows: [
          {
            amount: 15000,
            employeeName: 'S. Fernando',
            dateRequested: '2026-11-02',
          },
        ],
      }),
    },
    payroll: {
      month: jest.fn(
        (q: { month: string; status?: string; issues?: string[] }) => {
          calls.push(`payroll(${JSON.stringify(q)})`);
          return Promise.resolve({
            total: q.issues ? 2 : q.status ? 9 : 11,
            readiness: {
              status:
                q.month === '2026-10' ? 'Ready to process' : 'In progress',
              blocking: 0,
            },
          });
        },
      ),
    },
    payChanges: {
      list: spy('payChanges', [
        {
          status: 'pending',
          approval: { canDecide: true },
          requestedAt: '2026-11-10T03:00:00.000Z',
        },
        {
          status: 'pending',
          approval: { canDecide: false },
          requestedAt: '2026-11-01T03:00:00.000Z',
        },
        {
          status: 'approved',
          approval: { canDecide: false },
          requestedAt: '2026-10-01T03:00:00.000Z',
        },
      ]),
    },
    holidays: {
      year: spy('holidays', {
        pending: [{ dateFrom: '2026-12-25' }, { dateFrom: '2026-12-01' }],
      }),
    },
    settlements: {
      // every pending row (limit 0): the same list the settlements page shows
      list: jest.fn((q: object) => {
        calls.push(`settlements(${JSON.stringify(q)})`);
        const rows = [
          { period: 'July 2026', missingBank: true },
          { period: 'July 2026', missingBank: false },
          { period: 'July 2026', missingBank: false },
        ];
        return Promise.resolve({ rows, total: rows.length });
      }),
    },
    transport: {
      forPeriod: spy('transport', { configured: opts.transport ?? true }),
    },
    audit: {
      list: opts.failAudit
        ? () => Promise.reject(new Error('audit down'))
        : spy('audit', [
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
    s.transport,
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
    expect(s.actions.map((a) => [a.group, a.key, a.count, a.href])).toEqual([
      [
        'urgent',
        'estatesNoBank',
        1,
        '/estates/settlements?month=all&status=Pending&bank=missing',
      ],
      [
        'urgent',
        'payrollDue',
        9,
        '/employees/payroll?month=2026-10&status=Pending',
      ],
      [
        'urgent',
        'ungradedOld',
        1,
        '/collections?grade=Ungraded&status=Collected&olderThan=7',
      ],
      // no settlementsToProcess: processing needs estateOwners Approve
      [
        'dueSoon',
        'staleAllocations',
        1,
        '/fertilizer/requests?tab=all&scope=stale',
      ],
      ['dueSoon', 'expiredStock', 2, '/fertilizer/alerts#expired'],
      ['toDecide', 'salaryAdvances', 4, '/employees/advances'],
      [
        'toDecide',
        'fertilizerToDecide',
        2,
        '/fertilizer/requests?status=Requested',
      ],
    ]);
    const reason = (k: string) => s.actions.find((a) => a.key === k)?.reason;
    expect(reason('estatesNoBank')).toBe('Blocks 1 of 3 pending settlements');
    expect(reason('ungradedOld')).toBe(
      "Oldest delivered 01 Nov 2026; ungraded leaf can't be settled",
    );
    expect(reason('fertilizerToDecide')).toBe('Oldest requested 03 Nov 2026');
    expect(reason('salaryAdvances')).toBe('Oldest requested 02 Nov 2026');
    expect(reason('expiredStock')).toBe(
      '1,250 kg; written off on Expiry Alerts',
    );
    // one primary button: the top row's action; "Review approvals" counts To decide
    expect(s.primaryAction).toEqual({
      label: 'Fix bank details',
      href: '/estates/settlements?month=all&status=Pending&bank=missing',
      key: 'estatesNoBank',
    });
    expect(s.toDecide).toBe(2);
    // nothing decides money on the dashboard
    expect(s.actions.find((a) => a.key === 'salaryAdvances')?.action).toBe(
      'Review',
    );
    // every pending row is read, and each pending month's transport is checked
    expect(calls).toContain(
      'settlements({"month":"all","status":"Pending","limit":0})',
    );
    expect(calls).toContain('transport(["July 2026"])');
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
    expect(s.primaryAction?.key).toBe('fertilizerManager');
    expect(s.toDecide).toBe(2);
    expect(s.actions[0].reason).toBe('Oldest requested 15 Nov 2026');
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
    expect(s.charts?.changePct).toBe(11.1);
    expect(s.charts?.compare).toEqual({ from: '2026-10-01', to: '2026-10-17' });
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

  it('Expenses is Manager and Administrator only: an Officer with expenses access never gets or loads it', async () => {
    const { service, actor, calls } = build('Officer', {
      ...DEFAULTS.Officer,
      expenses: 'approve',
    });
    const s = await service.summary(actor, NOW);
    expect(s.monthView).toBeNull();
    expect(calls.some((c) => c.startsWith('expenses('))).toBe(false);
    for (const role of ['Manager', 'Administrator'] as const) {
      const r = build(role);
      const m = await r.service.summary(r.actor, NOW);
      expect(m.monthView?.expenses).toMatchObject({ totalRs: 420000 });
    }
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

  it('settlements while a month has no transport amount: blocked, no ready count', async () => {
    // the Administrator (Approve) is the one asked to process settlements
    const { service, actor } = build('Administrator', DEFAULTS.Administrator, {
      transport: false,
    });
    const s = await service.summary(actor, NOW);
    const row = s.actions.find((a) => a.key === 'settlementsToProcess');
    expect(row).toMatchObject({
      count: 3,
      reason: 'Blocked: monthly transport amount not set',
      blocked: true,
    });
  });

  it('a single salary advance names the amount and who asked', async () => {
    const { service, actor } = build('Officer');
    const advances = (service as unknown as { advances: { list: unknown } })
      .advances;
    advances.list = () =>
      Promise.resolve({
        tabCounts: { decide: 1 },
        rows: [
          {
            amount: 15000,
            employeeName: 'S. Fernando',
            dateRequested: '2026-11-02',
          },
        ],
      });
    const s = await service.summary(actor, NOW);
    expect(s.actions.find((a) => a.key === 'salaryAdvances')?.reason).toBe(
      'Rs. 15,000 requested by S. Fernando',
    );
  });

  it('one failing source only empties its own section', async () => {
    const { service, actor } = build('Manager', DEFAULTS.Manager, {
      failAudit: true,
    });
    const s = await service.summary(actor, NOW);
    expect(s.errors).toEqual({ activity: "Couldn't load this section." });
    expect(s.activity).toEqual([]);
    expect(s.todayView).not.toBeNull();
    expect(s.monthView).not.toBeNull();
    expect(s.actions.length).toBeGreaterThan(0);
  });

  it('the response has exactly the agreed top-level keys, for every role', async () => {
    for (const role of ['Officer', 'Manager', 'Administrator'] as const) {
      const { service, actor } = build(role);
      const s = await service.summary(actor, NOW);
      expect(Object.keys(s)).toEqual([...DASHBOARD_SUMMARY_KEYS]);
    }
  });
});
