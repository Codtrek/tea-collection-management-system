import { ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AuditService } from '../audit/audit.service';
import type { CollectionRecordEntity } from '../collections/collection-record.entity';
import type { EstateEntity } from '../estates/estate.entity';
import type { SettlementEntity } from '../estates/settlement.entity';
import type { Actor } from './admin.service';
import type { TransportRateEntity } from './transport-rate.entity';
import { TransportRatesService } from './transport-rates.service';

/** Minimal in-memory Repository: find (optional single-field where), findOne, create, save. */
class Fake<T extends object> {
  rows: T[] = [];
  private seq = 0;
  find(opts?: { where?: Partial<T> }): Promise<T[]> {
    const w = opts?.where ? Object.entries(opts.where) : [];
    return Promise.resolve(
      this.rows.filter((r) =>
        w.every(([k, v]) => (r as Record<string, unknown>)[k] === v),
      ),
    );
  }
  findOne(opts: { where: Partial<T> }): Promise<T | null> {
    return this.find(opts).then((r) => r[0] ?? null);
  }
  create(p: Partial<T>): T {
    return { ...p } as T;
  }
  save(row: T): Promise<T> {
    const r = row as T & { id?: number; createdAt?: Date };
    if (r.id == null) {
      r.id = ++this.seq;
      r.createdAt ??= this.now;
      this.rows.push(row);
    }
    return Promise.resolve(row);
  }
  now = new Date('2026-11-15T04:00:00Z');
}

const admin: Actor = { name: 'A. Bandara', role: 'Administrator', sub: 1 };
const officer: Actor = { name: 'S. Fernando', role: 'Officer', sub: 2 };
// Colombo 2026-11-15
const NOV = new Date('2026-11-15T04:00:00Z');

function build() {
  const rates = new Fake<TransportRateEntity>();
  const settlements = new Fake<SettlementEntity>();
  const deliveries = new Fake<CollectionRecordEntity>();
  const estates = new Fake<EstateEntity>();
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  // the seeded per-km placeholder, never applied
  rates.rows.push({
    id: 99,
    effectiveDate: '2019-01-01',
    basis: 'per_km',
    rate: '42.00',
    minimumCharge: '500.00',
    basisConfirmed: false,
    neverApplied: true,
    reason: 'Seed',
    setBy: 'seed',
    createdAt: new Date('2026-11-15T00:00:00Z'),
    cancelledAt: new Date('2026-11-15T00:00:00Z'),
    cancelledBy: 'migration',
    cancelReason: 'Never applied — the basis was never confirmed',
  });
  settlements.rows.push(
    {
      id: 'SET-2026-07-001',
      period: 'July 2026',
      status: 'pending',
    } as SettlementEntity,
    {
      id: 'SET-2026-06-001',
      period: 'June 2026',
      status: 'processed',
    } as SettlementEntity,
  );
  const service = new TransportRatesService(
    rates as unknown as Repository<TransportRateEntity>,
    settlements as unknown as Repository<SettlementEntity>,
    deliveries as unknown as Repository<CollectionRecordEntity>,
    estates as unknown as Repository<EstateEntity>,
    audit as unknown as AuditService,
  );
  return { service, rates, settlements, deliveries, estates, audit };
}

const charge = (
  amount: number,
  effectiveMonth: string,
  reason = 'Agreed with the estates',
) => ({
  amount,
  effectiveMonth,
  reason,
});

describe('TransportRatesService — monthly charge per estate (Administration-Addendum §4)', () => {
  it('lists the never-applied placeholder and offers the first-version back-date', async () => {
    const { service } = build();
    const view = await service.list(NOV);
    expect(view.versions[0]).toMatchObject({
      basis: 'per_km',
      neverApplied: true,
      backdated: false,
      status: 'cancelled',
    });
    expect(view.status.configured).toBe(false);
    expect(view.firstVersionFrom).toBe('2026-07');
    expect(view.nextMonth).toBe('2026-12');
  });

  it('the FIRST version may start in a past month — no earlier than the oldest unprocessed one', async () => {
    const { service, audit } = build();
    await expect(
      service.create(charge(5000, '2026-06'), admin, NOV),
    ).rejects.toThrow(/no earlier than July 2026/);
    const view = await service.create(charge(5000, '2026-07'), admin, NOV);
    const first = view.versions.find((v) => v.basis === 'fixed_month')!;
    expect(first).toMatchObject({
      effectiveDate: '2026-07-01',
      firstMonth: '2026-07',
      rate: 5000,
      backdated: true,
      status: 'current',
    });
    expect(view.status.configured).toBe(true);
    expect(view.firstVersionFrom).toBeNull();
    expect(audit.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'Updated transport charge',
        details:
          'Monthly transport charge per estate Rs. 5,000 from July 2026 (first version, back-dated) — Agreed with the estates',
      }),
    );
  });

  it('only the first: every later version starts next month or later', async () => {
    const { service } = build();
    await service.create(charge(5000, '2026-07'), admin, NOV);
    await expect(
      service.create(charge(5500, '2026-09'), admin, NOV),
    ).rejects.toThrow(/in the past/);
    await expect(
      service.create(charge(5500, '2026-11'), admin, NOV),
    ).rejects.toThrow(/in the past/);
    await expect(
      service.create(charge(5000, '2026-12'), admin, NOV),
    ).rejects.toThrow(/same as/);
    const view = await service.create(charge(5500, '2026-12'), admin, NOV);
    expect(view.versions.find((v) => v.firstMonth === '2026-12')).toMatchObject(
      { status: 'scheduled', backdated: false },
    );
  });

  it('Legacy (seed) rows never count; the month after the last processed one is still to settle', async () => {
    const { service, settlements } = build();
    settlements.rows = [
      { id: 'SET-2026-07-001', period: 'July 2026', status: 'legacy' },
      { id: 'SET-2026-05-001', period: 'May 2026', status: 'processed' },
      { id: 'SET-2026-06-001', period: 'June 2026', status: 'processed' },
    ] as SettlementEntity[];
    expect((await service.list(NOV)).firstVersionFrom).toBe('2026-07');
    // a pending draft for an even earlier month wins
    settlements.rows.push({
      id: 'SET-2026-04-009',
      period: 'April 2026',
      status: 'pending',
    } as SettlementEntity);
    expect((await service.list(NOV)).firstVersionFrom).toBe('2026-04');
  });

  it('no waiting settlements = no back-date at all', async () => {
    const { service, settlements } = build();
    settlements.rows = [];
    expect((await service.list(NOV)).firstVersionFrom).toBeNull();
    await expect(
      service.create(charge(5000, '2026-07'), admin, NOV),
    ).rejects.toThrow(/in the past/);
  });

  it('a scheduled version can be cancelled with a reason; a started one cannot', async () => {
    const { service } = build();
    await service.create(charge(5000, '2026-07'), admin, NOV);
    const view = await service.create(charge(5500, '2027-01'), admin, NOV);
    const scheduled = view.versions.find((v) => v.status === 'scheduled')!;
    const current = view.versions.find((v) => v.status === 'current')!;
    await expect(service.cancel(current.id, 'x', admin, NOV)).rejects.toThrow(
      /already started/,
    );
    const after = await service.cancel(scheduled.id, 'Not agreed', admin, NOV);
    expect(after.versions.find((v) => v.id === scheduled.id)?.status).toBe(
      'cancelled',
    );
  });

  it('a reason is required and only an Administrator may publish', async () => {
    const { service } = build();
    await expect(
      service.create(charge(5000, '2026-12', ' '), admin, NOV),
    ).rejects.toThrow(/reason/);
    await expect(
      service.create(charge(5000, '2026-12'), officer, NOV),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('preview: last month’s delivering estates, once each, self-delivery left out', async () => {
    const { service, deliveries, estates } = build();
    estates.rows.push(
      { id: 1, selfDelivery: false } as EstateEntity,
      { id: 2, selfDelivery: false } as EstateEntity,
      { id: 3, selfDelivery: true } as EstateEntity,
    );
    const d = (
      estateId: number,
      collectionDate: string,
      status = 'confirmed',
    ) =>
      ({
        estateId,
        collectionDate,
        status,
      }) as unknown as CollectionRecordEntity;
    deliveries.rows.push(
      d(1, '2026-10-02'),
      d(1, '2026-10-09'),
      d(1, '2026-10-20'),
      d(2, '2026-10-05'),
      d(3, '2026-10-05'),
      d(2, '2026-11-02'),
      d(2, '2026-09-30'),
      d(4, '2026-10-01', 'pending'),
    );
    expect(await service.preview(5000, NOV)).toEqual({
      month: '2026-10',
      estates: 2,
      total: 10000,
      exempt: 1,
    });
  });
});
