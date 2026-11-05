import {
  cancelError,
  newVersionError,
  versionBefore,
  versionInForce,
  versionStatus,
} from './versioning';

/** Effective-dated versions — the rules every money rate follows (Administration-Addendum §1). */

interface V {
  effectiveDate: string;
  rate: number;
  cancelledAt?: Date | null;
}
const v = (effectiveDate: string, rate: number, cancelled = false): V => ({
  effectiveDate,
  rate,
  cancelledAt: cancelled ? new Date('2026-03-01T00:00:00Z') : null,
});
const TODAY = '2026-03-15';

describe('which version applies', () => {
  const rows = [
    v('2026-01-01', 100),
    v('2026-03-01', 110),
    v('2026-04-01', 120),
  ];

  it('a past date keeps the version in force then, after newer versions are added', () => {
    expect(versionInForce(rows, '2026-02-10')?.rate).toBe(100);
    expect(
      versionInForce([...rows, v('2026-02-11', 999)], '2026-02-10')?.rate,
    ).toBe(100);
    expect(versionInForce(rows, '2025-12-31')).toBeNull();
  });

  it('a cancelled version is ignored', () => {
    const withCancelled = [...rows, v('2026-03-10', 500, true)];
    expect(versionInForce(withCancelled, '2026-03-12')?.rate).toBe(110);
    expect(versionStatus(withCancelled[3], withCancelled, TODAY)).toBe(
      'cancelled',
    );
  });

  it('current / scheduled / past', () => {
    expect(rows.map((r) => versionStatus(r, rows, TODAY))).toEqual([
      'past',
      'current',
      'scheduled',
    ]);
    expect(versionBefore(rows, '2026-04-01')?.rate).toBe(110);
  });
});

describe('publishing and cancelling', () => {
  const rows = [v('2026-01-01', 100), v('2026-04-01', 120)];
  const same = (rate: number) => (x: V) => x.rate === rate;

  it('needs a reason, today or later, a free date, and a change', () => {
    expect(
      newVersionError(rows, '2026-05-01', TODAY, same(130), 'rate', '')?.kind,
    ).toBe('reason');
    expect(
      newVersionError(rows, '2026-03-14', TODAY, same(130), 'rate', 'r')?.kind,
    ).toBe('past');
    expect(
      newVersionError(rows, '2026-04-01', TODAY, same(130), 'rate', 'r')?.kind,
    ).toBe('clash');
    // identical to the version it would follow (the April one)
    expect(
      newVersionError(rows, '2026-05-01', TODAY, same(120), 'rate', 'r')?.kind,
    ).toBe('identical');
    expect(
      newVersionError(rows, TODAY, TODAY, same(130), 'rate', 'r'),
    ).toBeNull();
  });

  it('a cancelled version frees its date', () => {
    expect(
      newVersionError(
        [...rows, v('2026-05-01', 1, true)],
        '2026-05-01',
        TODAY,
        same(130),
        'rate',
        'r',
      ),
    ).toBeNull();
  });

  it('only a scheduled, live version can be cancelled, with a reason', () => {
    expect(cancelError(rows[1], TODAY, 'mistake')).toBeNull();
    expect(cancelError(rows[1], TODAY, ' ')).toMatch(/reason/);
    expect(cancelError(rows[0], TODAY, 'x')).toMatch(/already started/);
    expect(cancelError(v('2026-05-01', 1, true), TODAY, 'x')).toMatch(
      /already cancelled/,
    );
  });
});
