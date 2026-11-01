import {
  type AdvanceRow,
  listAdvanceView,
  rowsForTab,
  summarizeAdvances,
} from './advance-view';

const row = (id: string, over: Partial<AdvanceRow>): AdvanceRow => ({
  id,
  employeeId: 'EMP-0001',
  employeeName: 'K. Perera',
  amount: 10000,
  reason: '',
  dateRequested: '2026-10-10',
  status: 'Approved',
  recovery: 'Not started',
  remaining: 10000,
  recovered: 0,
  carriedForward: 0,
  payrollPeriod: null,
  recoveredPeriod: null,
  role: 'Factory Officer',
  routes: [],
  ...over,
});

const OCT = { from: '2026-10-01', to: '2026-10-31' };

describe('Salary Advances list', () => {
  const all = [
    row('OLD-PENDING', {
      status: 'Pending',
      dateRequested: '2026-07-10',
      recovery: null,
      remaining: 0,
    }),
    row('OCT-APPROVED', {}),
    row('JUL-APPROVED', {
      dateRequested: '2026-07-08',
      amount: 20000,
      remaining: 20000,
    }),
    row('OCT-REJECTED', {
      status: 'Rejected',
      dateRequested: '2026-10-02',
      recovery: null,
      remaining: 0,
      employeeName: 'N. Silva',
      role: 'Tea Collecting Agent',
      routes: [{ id: 2, name: 'Route 3' }],
    }),
  ];

  it('an old pending request shows on "Needs decision" whatever the date range', () => {
    expect(rowsForTab(all, { tab: 'decide', ...OCT }).map((r) => r.id)).toEqual(
      ['OLD-PENDING'],
    );
    // the other tabs keep the range
    expect(rowsForTab(all, { tab: 'all', ...OCT }).map((r) => r.id)).toEqual([
      'OCT-APPROVED',
      'OCT-REJECTED',
    ]);
  });

  it('the tab counts and pending count ignore the range for pending', () => {
    const out = listAdvanceView(all, { tab: 'all', ...OCT }, []);
    expect(out.tabCounts).toEqual({
      decide: 1,
      approved: 1,
      rejected: 1,
      all: 2,
    });
    expect(out.summary.pendingCount).toBe(1);
  });

  it('summary: requested/approved in range; outstanding across every approved advance', () => {
    expect(summarizeAdvances(all, OCT.from, OCT.to)).toEqual({
      requested: 20000,
      approved: 10000,
      pendingCount: 1,
      outstanding: 30000,
    });
  });

  it('filters by search (name or reference), role, route and amount', () => {
    const q = { tab: 'all' as const };
    expect(listAdvanceView(all, { ...q, search: 'silva' }, []).total).toBe(1);
    expect(listAdvanceView(all, { ...q, search: 'jul-app' }, []).total).toBe(1);
    expect(
      listAdvanceView(all, { ...q, role: 'Tea Collecting Agent' }, []).total,
    ).toBe(1);
    expect(listAdvanceView(all, { ...q, routeId: 2 }, []).total).toBe(1);
    expect(
      listAdvanceView(all, { ...q, min: 15000 }, []).rows.map((r) => r.id),
    ).toEqual(['JUL-APPROVED']);
  });

  it('"Needs decision" lists oldest first, the others newest first', () => {
    const two = [
      row('P1', { status: 'Pending', dateRequested: '2026-10-05' }),
      row('P2', { status: 'Pending', dateRequested: '2026-07-01' }),
    ];
    expect(
      listAdvanceView(two, { tab: 'decide' }, []).rows.map((r) => r.id),
    ).toEqual(['P2', 'P1']);
    expect(
      listAdvanceView(two, { tab: 'all' }, []).rows.map((r) => r.id),
    ).toEqual(['P1', 'P2']);
  });
});
