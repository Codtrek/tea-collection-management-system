import {
  applyAdvanceFilters,
  buildAdvanceList,
  type EstateAdvanceRow,
  toAdvanceRow,
} from './estate-advance-view';
import type { PublicAdvance } from './estate-map';
import type { EstateFacts } from './settlement-view';

const facts = (
  ownerName: string,
  routeId: number,
  route: string,
): EstateFacts => ({
  ownerName,
  routeId,
  route,
  paymentMethod: 'bank',
  active: true,
});

function row(
  id: string,
  estateId: number,
  amount: number,
  dateIssued: string,
  issuedBy: string,
  recoveries: { advanceId: string; amount: string; recoveredAt: Date }[],
  f: EstateFacts,
): EstateAdvanceRow {
  const pub: PublicAdvance = {
    id,
    estateId: `EST-${String(estateId).padStart(4, '0')}`,
    estateName: `Estate ${estateId}`,
    amount,
    reason: 'r',
    dateIssued,
    issuedBy,
    status: 'Pending deduction',
  };
  return toAdvanceRow(
    pub,
    { id, estateId, amount: String(amount) },
    f,
    recoveries,
  );
}

describe('estate-advance-view', () => {
  const recoveries = [
    {
      advanceId: 'EADV-0022',
      amount: '40000',
      recoveredAt: new Date('2026-07-01T00:00:00Z'),
    },
    {
      advanceId: 'EADV-0040',
      amount: '5000',
      recoveredAt: new Date('2026-11-05T00:00:00Z'),
    },
  ];
  const green = facts('K. Silva', 1, 'Route A');
  const mount = facts('P. Jayasuriya', 3, 'Route C');
  const rows = [
    row('EADV-0031', 1, 50000, '2026-07-05', 'S. Fernando', recoveries, green),
    row('EADV-0022', 3, 40000, '2026-05-30', 'A. Bandara', recoveries, mount),
    row('EADV-0040', 3, 20000, '2026-11-02', 'A. Bandara', recoveries, mount),
  ];
  const november = { from: '2026-11-01', to: '2026-11-30' };

  it('rows carry recovered, remaining and recovery status from the shared selector', () => {
    const [gv, mr, part] = rows;
    expect([gv.recovered, gv.remaining, gv.recovery]).toEqual([
      0,
      50000,
      'Pending deduction',
    ]);
    expect([mr.recovered, mr.remaining, mr.recovery]).toEqual([
      40000,
      0,
      'Deducted',
    ]);
    expect([part.recovered, part.remaining, part.recovery]).toEqual([
      5000,
      15000,
      'Partly deducted',
    ]);
    expect(gv.ownerName).toBe('K. Silva');
  });

  it('pending deductions show whatever the date range; recovered ones only in range', () => {
    expect(applyAdvanceFilters(rows, november).map((r) => r.id)).toEqual([
      'EADV-0031',
      'EADV-0040',
    ]);
    expect(
      applyAdvanceFilters(rows, { from: '2026-05-01', to: '2026-05-31' }).map(
        (r) => r.id,
      ),
    ).toContain('EADV-0022');
  });

  it('search matches estate, owner or reference; route, status and issuer narrow', () => {
    expect(
      applyAdvanceFilters(rows, { search: 'silva' }).map((r) => r.id),
    ).toEqual(['EADV-0031']);
    expect(
      applyAdvanceFilters(rows, { search: 'eadv-0022' }).map((r) => r.id),
    ).toEqual(['EADV-0022']);
    expect(applyAdvanceFilters(rows, { routeId: 3 }).length).toBe(2);
    expect(
      applyAdvanceFilters(rows, { status: 'Deducted' }).map((r) => r.id),
    ).toEqual(['EADV-0022']);
    expect(
      applyAdvanceFilters(rows, { issuedBy: 'S. Fernando' }).map((r) => r.id),
    ).toEqual(['EADV-0031']);
  });

  it('summary covers the range and ignores the other filters; pending is any date', () => {
    const res = buildAdvanceList(rows, recoveries, {
      ...november,
      search: 'silva',
    });
    expect(res.rows.map((r) => r.id)).toEqual(['EADV-0031']);
    expect(res.summary).toEqual({
      issued: 20000,
      issuedCount: 1,
      deducted: 5000,
      pendingDeduction: 65000,
      pendingCount: 2,
    });
    expect(res.issuers).toEqual(['A. Bandara', 'S. Fernando']);
    expect(res.routes).toEqual([
      { id: 1, name: 'Route A' },
      { id: 3, name: 'Route C' },
    ]);
  });

  it('newest first and paged', () => {
    const res = buildAdvanceList(rows, recoveries, { pageSize: 2 });
    expect(res.rows.map((r) => r.id)).toEqual(['EADV-0040', 'EADV-0031']);
    expect([res.total, res.hasMore]).toEqual([3, true]);
  });
});
