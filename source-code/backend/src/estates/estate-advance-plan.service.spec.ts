import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AuditService } from '../audit/audit.service';
import { EstateAdvancePlanService } from './estate-advance-plan.service';
import type { EstateAdvanceRecoveryEntity } from './estate-advance-recovery.entity';
import type { EstateAdvanceRescheduleEntity } from './estate-advance-reschedule.entity';
import {
  DEFAULT_ESTATE_ADVANCE_SETTINGS,
  type EstateAdvanceSettingsService,
} from './estate-advance-settings.service';
import type { EstateAdvanceEntity } from './estate-advance.entity';
import type { Actor, EstatesService } from './estates.service';

/** In-memory repo — SERIAL ids like the DB. */
function fake<T extends { id: string | number }>(seed: T[] = []) {
  const rows = new Map<string | number, T>(seed.map((r) => [r.id, r]));
  return {
    rows,
    find: ({ where }: { where?: Partial<T> } = {}) =>
      Promise.resolve(
        [...rows.values()].filter(
          (r) =>
            !where ||
            Object.entries(where).every(
              ([k, v]) => (r as Record<string, unknown>)[k] === v,
            ),
        ),
      ),
    findOne: ({ where }: { where: Partial<T> }) =>
      Promise.resolve(
        [...rows.values()].find((r) =>
          Object.entries(where).every(
            ([k, v]) => (r as Record<string, unknown>)[k] === v,
          ),
        ) ?? null,
      ),
    create: (p: Partial<T>) =>
      ({ createdAt: new Date(), ...p }) as unknown as T,
    save: (r: T) => {
      if (r.id === undefined) (r as { id: number }).id = rows.size + 1;
      rows.set(r.id, r);
      return Promise.resolve(r);
    },
  };
}

const officer: Actor = { name: 'S. Fernando', role: 'Officer', sub: 11 };
const other: Actor = { name: 'A. Bandara', role: 'Officer', sub: 12 };

function setup() {
  const advances = fake<EstateAdvanceEntity>([
    {
      id: 'EADV-1',
      estateId: 1,
      estateName: 'Green Valley Estate',
      amount: '50000',
      reason: 'r',
      dateIssued: '2026-11-05',
      issuedBy: officer.name,
      status: 'recovering',
      installmentAmount: '10000',
      installmentMonths: 5,
      startPeriod: 'December 2026',
      createdAt: new Date(),
    },
  ]);
  const recoveries = fake<EstateAdvanceRecoveryEntity>([
    {
      id: 1,
      advanceId: 'EADV-1',
      settlementId: 'SET-12',
      kind: 'settlement',
      period: 'December 2026',
      plannedAmount: '10000',
      amount: '10000',
      status: 'recovered',
      reference: null,
      paidOn: null,
      recordedBy: 'x',
      recoveredAt: new Date(),
      createdAt: new Date(),
    },
  ]);
  const reschedules = fake<EstateAdvanceRescheduleEntity>();
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new EstateAdvancePlanService(
    advances as unknown as Repository<EstateAdvanceEntity>,
    recoveries as unknown as Repository<EstateAdvanceRecoveryEntity>,
    reschedules as unknown as Repository<EstateAdvanceRescheduleEntity>,
    { assertCanWrite: () => undefined } as unknown as EstatesService,
    {
      get: () => Promise.resolve(DEFAULT_ESTATE_ADVANCE_SETTINGS),
    } as unknown as EstateAdvanceSettingsService,
    audit as unknown as AuditService,
  );
  return { service, advances, recoveries, audit };
}

describe('EstateAdvancePlanService — reschedule', () => {
  it('can’t start in a processed period', async () => {
    const { service } = setup();
    await expect(
      service.requestReschedule(
        'EADV-1',
        { installmentAmount: 8000, startMonth: '2026-12', note: 'x' },
        officer,
      ),
    ).rejects.toThrow(
      'December 2026 is already processed — start the new plan after it.',
    );
  });

  it('the requester can’t approve their own; someone else can, and the plan changes', async () => {
    const { service, advances, audit } = setup();
    const r = await service.requestReschedule(
      'EADV-1',
      { installmentAmount: 8000, startMonth: '2027-02', note: 'Poor season' },
      officer,
    );
    await expect(
      service.decideReschedule(
        'EADV-1',
        r.id,
        { decision: 'approve' },
        officer,
      ),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.decideReschedule('EADV-1', r.id, { decision: 'reject' }, other),
    ).rejects.toThrow('A reason is required to reject a reschedule.');
    const decided = await service.decideReschedule(
      'EADV-1',
      r.id,
      { decision: 'approve' },
      other,
    );
    expect(decided.status).toBe('Approved');
    const a = advances.rows.get('EADV-1')!;
    // Rs 40,000 left at Rs 8,000 → 5 periods from February 2027
    expect([a.installmentAmount, a.installmentMonths, a.startPeriod]).toEqual([
      '8000',
      5,
      'February 2027',
    ]);
    expect(audit.record).toHaveBeenCalledTimes(2);
  });
});

describe('EstateAdvancePlanService — early repayment', () => {
  it('records a bank repayment, shortens the balance, Deducted only at Rs. 0', async () => {
    const { service, advances } = setup();
    await expect(
      service.recordRepayment(
        'EADV-1',
        {
          kind: 'bank',
          amount: 50000,
          paidOn: '2027-01-10',
          reference: 'BOC-1',
        },
        other,
      ),
    ).rejects.toThrow(BadRequestException);
    const part = await service.recordRepayment(
      'EADV-1',
      { kind: 'bank', amount: 15000, paidOn: '2027-01-10', reference: 'BOC-1' },
      other,
    );
    expect(part.remaining).toBe(25000);
    expect(advances.rows.get('EADV-1')!.status).toBe('recovering');
    const done = await service.recordRepayment(
      'EADV-1',
      {
        kind: 'cash',
        amount: 25000,
        paidOn: '2027-01-12',
        reference: 'RCPT-9',
      },
      other,
    );
    expect(done.remaining).toBe(0);
    expect(advances.rows.get('EADV-1')!.status).toBe('deducted');
  });
});
