import {
  firstChargedMonth,
  monthlyCharge,
  takeTransport,
  transportStatus,
  versionForMonth,
  type TransportVersion,
} from './transport-rules';

const v = (o: Partial<TransportVersion> = {}): TransportVersion => ({
  id: 1,
  effectiveDate: '2026-07-01',
  basis: 'fixed_month',
  rate: 5000,
  minimumCharge: 0,
  basisConfirmed: true,
  neverApplied: false,
  cancelledAt: null,
  ...o,
});

describe('transport rules — a fixed monthly charge (Administration-Addendum §4)', () => {
  it('a version charges from the first month starting on or after its date', () => {
    expect(firstChargedMonth('2026-07-01')).toBe('2026-07');
    expect(firstChargedMonth('2026-07-15')).toBe('2026-08');
    expect(firstChargedMonth('2026-12-02')).toBe('2027-01');
  });

  it('the version for a month is the latest live fixed-monthly one covering it', () => {
    const rows = [
      v({ id: 1, effectiveDate: '2026-07-01', rate: 5000 }),
      v({ id: 2, effectiveDate: '2026-09-01', rate: 5500 }),
      v({
        id: 3,
        effectiveDate: '2026-10-01',
        rate: 6000,
        cancelledAt: new Date(),
      }),
      v({ id: 4, effectiveDate: '2019-01-01', basis: 'per_km', rate: 42 }),
    ];
    expect(versionForMonth(rows, '2026-06')).toBeNull();
    expect(versionForMonth(rows, '2026-08')?.id).toBe(1);
    expect(versionForMonth(rows, '2026-09')?.id).toBe(2);
    expect(versionForMonth(rows, '2026-10')?.id).toBe(2);
  });

  it('a per-km row never counts, so with only that transport is not configured', () => {
    const s = transportStatus(
      [v({ basis: 'per_km', rate: 42, effectiveDate: '2019-01-01' })],
      '2026-07',
    );
    expect(s.configured).toBe(false);
    expect(s.reason).toBe(
      'Transport: not configured. No monthly transport charge covers July 2026 (Factory Setup → Transport Rates).',
    );
  });

  it('charged ONCE for the month, however many deliveries', () => {
    const one = monthlyCharge({
      versions: [v()],
      month: '2026-07',
      selfDelivery: false,
      deliveries: 1,
    });
    const many = monthlyCharge({
      versions: [v()],
      month: '2026-07',
      selfDelivery: false,
      deliveries: 23,
    });
    expect(one).toMatchObject({ status: 'charged', charge: 5000 });
    expect(many).toMatchObject({ status: 'charged', charge: 5000 });
  });

  it('no deliveries = no charge; self-delivery = exempt (even with no version)', () => {
    expect(
      monthlyCharge({
        versions: [v()],
        month: '2026-07',
        selfDelivery: false,
        deliveries: 0,
      }),
    ).toMatchObject({ status: 'no_deliveries', charge: 0 });
    expect(
      monthlyCharge({
        versions: [],
        month: '2026-07',
        selfDelivery: true,
        deliveries: 9,
      }),
    ).toMatchObject({ status: 'exempt', charge: 0 });
    expect(
      monthlyCharge({
        versions: [],
        month: '2026-07',
        selfDelivery: false,
        deliveries: 9,
      }),
    ).toMatchObject({ status: 'not_configured', charge: 0 });
  });

  it('takes no more than what is left after the other deductions; the rest is carried', () => {
    expect(
      takeTransport({ due: 5000, gross: 90000, adjustment: 0, others: 70000 }),
    ).toEqual({
      taken: 5000,
      carriedOut: 0,
    });
    expect(
      takeTransport({
        due: 5000,
        gross: 20000,
        adjustment: -500,
        others: 17000,
      }),
    ).toEqual({
      taken: 2500,
      carriedOut: 2500,
    });
    // already short before transport: nothing taken, net stays at what it was (never below 0 from transport)
    expect(
      takeTransport({ due: 5000, gross: 10000, adjustment: 0, others: 12000 }),
    ).toEqual({
      taken: 0,
      carriedOut: 5000,
    });
  });
});
