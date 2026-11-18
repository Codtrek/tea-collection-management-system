import type { TransportVersion } from '../admin/transport-rules';
import {
  transportLines,
  type TransportSettlementFacts,
} from './settlement-transport';

const v = (o: Partial<TransportVersion> = {}): TransportVersion => ({
  id: 7,
  effectiveDate: '2026-07-01',
  basis: 'fixed_month',
  rate: 5000,
  minimumCharge: 0,
  basisConfirmed: true,
  neverApplied: false,
  cancelledAt: null,
  ...o,
});

const s = (
  o: Partial<TransportSettlementFacts> = {},
): TransportSettlementFacts => ({
  id: 'SET-2026-07-001',
  estateId: 1,
  period: 'July 2026',
  status: 'pending',
  selfDelivery: false,
  gross: 90000,
  adjustment: 0,
  others: 70000,
  transportStatus: null,
  transportCharge: null,
  transportVersionId: null,
  transportCarriedIn: 0,
  transportCarriedOut: 0,
  transportCost: 8400,
  ...o,
});

const deliveries = (n: number) => () => n;

describe('settlement transport lines (Administration-Addendum §4)', () => {
  it('a pending settlement gets the month’s charge with the version it came from', () => {
    const line = transportLines([s()], [v()], deliveries(3), () => true).get(
      'SET-2026-07-001',
    );
    expect(line).toEqual({
      status: 'charged',
      charge: 5000,
      carriedIn: 0,
      taken: 5000,
      carriedOut: 0,
      versionId: 7,
      versionMonth: '2026-07',
      frozen: false,
    });
  });

  it('a processed settlement keeps its frozen line after a new version', () => {
    const processed = s({
      status: 'processed',
      transportStatus: 'charged',
      transportCharge: '5000',
      transportVersionId: 7,
      transportCost: '5000',
    });
    const versions = [
      v(),
      v({ id: 8, effectiveDate: '2026-07-01', rate: 9000, cancelledAt: null }),
    ];
    const line = transportLines(
      [processed],
      versions,
      deliveries(3),
      () => true,
    ).get(processed.id);
    expect(line).toMatchObject({
      status: 'charged',
      charge: 5000,
      taken: 5000,
      versionId: 7,
      frozen: true,
    });
  });

  it('history processed before the monthly charge has no line and carries nothing', () => {
    const old = s({
      id: 'SET-2026-06-001',
      period: 'June 2026',
      status: 'processed',
    });
    const lines = transportLines([old, s()], [v()], deliveries(1), () => true);
    expect(lines.get(old.id)).toBeNull();
    expect(lines.get('SET-2026-07-001')?.carriedIn).toBe(0);
  });

  it('a shortfall is carried to the estate’s next settlement', () => {
    const july = s({ gross: 20000, others: 17000 });
    const aug = s({ id: 'SET-2026-08-001', period: 'August 2026' });
    const lines = transportLines([aug, july], [v()], deliveries(2), () => true);
    expect(lines.get(july.id)).toMatchObject({ taken: 3000, carriedOut: 2000 });
    expect(lines.get(aug.id)).toMatchObject({
      carriedIn: 2000,
      taken: 7000,
      carriedOut: 0,
    });
  });

  it('a carry is still collected in a month with no deliveries', () => {
    const before = s({
      id: 'SET-2026-07-001',
      status: 'processed',
      transportStatus: 'charged',
      transportCharge: '5000',
      transportVersionId: 7,
      transportCost: '3000',
      transportCarriedOut: '2000',
    });
    const aug = s({ id: 'SET-2026-08-001', period: 'August 2026' });
    const line = transportLines(
      [before, aug],
      [v()],
      deliveries(0),
      () => true,
    ).get(aug.id);
    expect(line).toMatchObject({
      status: 'no_deliveries',
      charge: 0,
      carriedIn: 2000,
      taken: 2000,
    });
  });

  it('a pending row that won’t be processed does not pass its carry on', () => {
    const july = s({ gross: 20000, others: 17000 });
    const aug = s({ id: 'SET-2026-08-001', period: 'August 2026' });
    const lines = transportLines(
      [july, aug],
      [v()],
      deliveries(2),
      (x) => x.id !== july.id,
    );
    expect(lines.get(aug.id)?.carriedIn).toBe(0);
  });

  it('not configured when no version covers the month', () => {
    const line = transportLines(
      [s()],
      [v({ effectiveDate: '2026-08-01' })],
      deliveries(2),
      () => true,
    ).get('SET-2026-07-001');
    expect(line).toMatchObject({ status: 'not_configured', taken: 0 });
  });
});
