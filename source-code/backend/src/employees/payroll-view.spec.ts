import {
  hasNoBankDetails,
  payrollMonthView,
  type PayrollViewRow,
  readinessOf,
} from './payroll-view';

const row = (
  id: string,
  over: Partial<PayrollViewRow> = {},
): PayrollViewRow => ({
  id,
  employeeId: `EMP-${id}`,
  employeeName: `Employee ${id}`,
  period: 'July 2026',
  gross: 80000,
  deductions: { advances: 0, other: 0 },
  status: 'Pending',
  role: 'Factory Officer',
  routes: [],
  paymentMethod: 'bank',
  deductionsTotal: 0,
  net: 80000,
  problems: { noBank: false, zeroGross: false, carriedForward: 0 },
  ...over,
});

const JULY = '2026-07';
const NOW = '2026-11';

describe('payroll month view', () => {
  const rows = [
    row('1', {
      employeeName: 'K. Perera',
      deductions: { advances: 20000, other: 0 },
      deductionsTotal: 20000,
      net: 60000,
    }),
    row('2', {
      employeeName: 'T. Rajapaksa',
      problems: { noBank: true, zeroGross: false, carriedForward: 0 },
    }),
    row('3', {
      employeeName: 'R. Senanayake',
      role: 'Tea Collecting Agent',
      routes: [{ id: 2, name: 'Route 3' }],
      gross: 0,
      net: 0,
      problems: { noBank: true, zeroGross: true, carriedForward: 0 },
    }),
    row('4', {
      employeeName: 'N. Silva',
      status: 'Processed',
      paymentMethod: 'cash',
    }),
  ];
  const view = (q: Parameters<typeof payrollMonthView>[3]) =>
    payrollMonthView(rows, [row('9')], 'June 2026', q, NOW, {
      routes: [],
      periods: [],
    });

  it('filters: search, role, route, status, method, issues (any of)', () => {
    expect(view({ month: JULY, search: 'perera' }).total).toBe(1);
    expect(view({ month: JULY, search: 'EMP-2' }).total).toBe(1);
    expect(view({ month: JULY, role: 'Tea Collecting Agent' }).total).toBe(1);
    expect(view({ month: JULY, routeId: 2 }).total).toBe(1);
    expect(view({ month: JULY, status: 'Processed' }).total).toBe(1);
    expect(view({ month: JULY, method: 'cash' }).total).toBe(1);
    expect(
      view({ month: JULY, issues: ['noBank'] }).rows.map((r) => r.id),
    ).toEqual(['3', '2']);
    expect(
      view({ month: JULY, issues: ['zeroGross', 'hasAdvance'] }).total,
    ).toBe(2);
    expect(
      view({ month: JULY, issues: ['hasDeductions'] }).rows.map((r) => r.id),
    ).toEqual(['1']);
  });

  it('the summary is the whole month — a filter never changes it', () => {
    const filtered = view({ month: JULY, issues: ['noBank'] });
    expect(filtered.total).toBe(2);
    expect(filtered.summary).toEqual({
      net: 220000,
      employees: 4,
      prev: { period: 'June 2026', net: 80000, employees: 1 },
    });
  });

  it('sorts on gross / deductions / net', () => {
    expect(view({ month: JULY, sort: 'net', dir: 'desc' }).rows[0].id).not.toBe(
      '3',
    );
    expect(view({ month: JULY, sort: 'gross', dir: 'asc' }).rows[0].id).toBe(
      '3',
    );
    expect(
      view({ month: JULY, sort: 'deductions', dir: 'desc' }).rows[0].id,
    ).toBe('1');
  });
});

describe('readiness badge', () => {
  it('"Ready to process" only with no blocking issue', () => {
    expect(readinessOf([row('1'), row('2')], JULY, NOW)).toEqual({
      status: 'Ready to process',
      blocking: 0,
      warnings: 0,
      excluded: 0,
    });
    const blocked = readinessOf(
      [
        row('1'),
        row('2', {
          problems: { noBank: true, zeroGross: true, carriedForward: 0 },
        }),
      ],
      JULY,
      NOW,
    );
    expect(blocked).toMatchObject({
      status: 'Issues to fix',
      blocking: 1,
      warnings: 1,
    });
  });

  it('Rs. 0 gross is a warning, not a block', () => {
    expect(
      readinessOf(
        [
          row('1', {
            problems: { noBank: false, zeroGross: true, carriedForward: 0 },
          }),
        ],
        JULY,
        NOW,
      ).status,
    ).toBe('Ready to process');
  });

  it('every remaining Pending row excluded with a reason → Processed, with the excluded count', () => {
    const r = readinessOf(
      [
        row('1', { status: 'Processed' }),
        row('2', {
          excludedReason: 'Bank form pending',
          problems: { noBank: true, zeroGross: false, carriedForward: 0 },
        }),
      ],
      JULY,
      NOW,
    );
    expect(r).toMatchObject({ status: 'Processed', blocking: 0, excluded: 1 });
  });

  it('the current month is in progress; a month with no rows has no payroll', () => {
    expect(readinessOf([row('1')], NOW, NOW).status).toBe('In progress');
    expect(readinessOf([], JULY, NOW).status).toBe('No payroll');
  });
});

describe('no bank details', () => {
  it('bank-paid with any field empty; cash-paid never', () => {
    const bank = { bankName: 'BOC', bankBranch: 'Kandy', bankAccount: '1' };
    expect(hasNoBankDetails({ ...bank, paymentMethod: 'bank' })).toBe(false);
    expect(
      hasNoBankDetails({ ...bank, bankAccount: '', paymentMethod: 'bank' }),
    ).toBe(true);
    expect(
      hasNoBankDetails({
        bankName: null,
        bankBranch: null,
        bankAccount: null,
        paymentMethod: 'cash',
      }),
    ).toBe(false);
  });
});
