import type { PublicSettlement } from './estate-map';
import {
  applyFilters,
  type EstateFacts,
  paginate,
  rowsInPeriod,
  sortRows,
  summarize,
  toSettlementRow,
} from './settlement-view';

const facts = (over: Partial<EstateFacts> = {}): EstateFacts => ({
  ownerName: 'K. Perera',
  routeId: 3,
  route: 'Route 3',
  paymentMethod: 'bank',
  active: true,
  ...over,
});

const settlement = (
  id: string,
  period: string,
  over: Partial<PublicSettlement> = {},
): PublicSettlement => ({
  id,
  estateId: 'EST-0001',
  estateName: 'Green Valley Estate',
  period,
  superKg: 100,
  normalKg: 100,
  superRate: 200,
  normalRate: 100,
  transportCost: 1000,
  fertilizerDeduction: 2000,
  advanceDeduction: 3000,
  adjustment: 0,
  status: 'Processed',
  selfDelivery: false,
  ...over,
});

describe('settlement period view', () => {
  const rows = [
    settlement('SET-2025-09-001', 'September 2025'),
    settlement('SET-2026-07-001', 'July 2026', { status: 'Pending' }),
    settlement('SET-2026-07-002', 'July 2026', {
      estateId: 'EST-0002',
      estateName: 'Hilltop Estate',
      status: 'Pending',
      superKg: 0,
      normalKg: 10,
    }),
    settlement('SET-2026-06-001', 'June 2026'),
  ].map((s) =>
    toSettlementRow(
      s,
      facts(
        s.estateId === 'EST-0002'
          ? {
              routeId: 4,
              route: 'Route 5',
              paymentMethod: 'cash',
              ownerName: 'S. Silva',
            }
          : {},
      ),
    ),
  );

  it('splits deductions and nets them with the stored formula', () => {
    const r = rows[0];
    expect(r.gross).toBe(30000);
    expect(r.deductions).toEqual({
      transport: 1000,
      fertilizer: 2000,
      advances: 3000,
    });
    expect(r.deductionsTotal).toBe(6000);
    expect(r.net).toBe(24000);
    expect(r.month).toBe('2025-09');
  });

  it('orders by the real period — July 2026 before September 2025, never alphabetically', () => {
    expect(sortRows(rows).map((r) => r.id)).toEqual([
      'SET-2026-07-001',
      'SET-2026-07-002',
      'SET-2026-06-001',
      'SET-2025-09-001',
    ]);
    expect(sortRows(rows, 'period', 'asc')[0].id).toBe('SET-2025-09-001');
  });

  it('scopes to the month, and "all" keeps every period', () => {
    expect(rowsInPeriod(rows, '2026-07').map((r) => r.id)).toEqual([
      'SET-2026-07-001',
      'SET-2026-07-002',
    ]);
    expect(rowsInPeriod(rows, 'all')).toHaveLength(4);
  });

  it('filters by search (estate, owner, reference), route, status, method and net ≤ 0', () => {
    const july = rowsInPeriod(rows, '2026-07');
    expect(
      applyFilters(july, { month: '2026-07', search: 'silva' }).map(
        (r) => r.id,
      ),
    ).toEqual(['SET-2026-07-002']);
    expect(
      applyFilters(july, { month: '2026-07', search: 'set-2026-07-001' }),
    ).toHaveLength(1);
    expect(applyFilters(july, { month: '2026-07', routeId: 4 })).toHaveLength(
      1,
    );
    expect(
      applyFilters(july, { month: '2026-07', method: 'cash' }),
    ).toHaveLength(1);
    // Hilltop: gross 1000 − 6000 deductions
    expect(
      applyFilters(july, { month: '2026-07', nonPositive: true }).map(
        (r) => r.id,
      ),
    ).toEqual(['SET-2026-07-002']);
  });

  it('noBank keeps only rows flagged "no bank details" (the Dashboard’s estates item)', () => {
    const flagged = rows.map((r) =>
      r.id === 'SET-2026-07-001' ? { ...r, missingBank: true } : r,
    );
    expect(
      applyFilters(flagged, {
        month: 'all',
        status: 'Pending',
        noBank: true,
      }).map((r) => r.id),
    ).toEqual(['SET-2026-07-001']);
  });

  it('the summary is the whole period — filters never change it', () => {
    const july = rowsInPeriod(rows, '2026-07');
    const s = summarize(
      july,
      '2026-07',
      { eligible: 5, notPrepared: 1, willPrepare: 3 },
      '2026-07',
    );
    expect(s).toMatchObject({
      prepared: 2,
      eligible: 5,
      pending: 2,
      processed: 0,
      legacy: 0,
      gross: 31000,
      deductionsTotal: 12000,
      net: 19000,
      notPrepared: 1,
      willPrepare: 3,
    });
    expect(s.deductions).toEqual({
      transport: 2000,
      fertilizer: 4000,
      advances: 6000,
      adjustments: 0,
    });
  });

  it('Legacy (seed) rows are listed but never counted in the figures', () => {
    const july = rowsInPeriod(rows, '2026-07').map((r, i) =>
      i === 0 ? { ...r, status: 'Legacy' as const } : r,
    );
    const s = summarize(july, '2026-07', null, '2026-07');
    expect(s).toMatchObject({ prepared: 1, legacy: 1, eligible: null });
    expect(s.gross).toBe(july[1].gross);
  });

  it('pages 0-based; limit 0 returns every row for the export', () => {
    expect(paginate([1, 2, 3], 1, 2)).toEqual({
      rows: [3],
      page: 1,
      limit: 2,
      total: 3,
      hasMore: false,
    });
    expect(paginate([1, 2, 3], 0, 0).rows).toEqual([1, 2, 3]);
  });
});
