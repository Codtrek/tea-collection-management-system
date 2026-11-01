import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { EstateAdvanceRecoveryEntity } from './estate-advance-recovery.entity';
import type { EstateAdvanceEntity } from './estate-advance.entity';
import { EstateAdvanceViewService } from './estate-advance-view.service';
import { EstatesService } from './estates.service';
import type { SettlementEntity } from './settlement.entity';
import type { SettlementViewService } from './settlement-view.service';

const repo = <T extends object>(rows: T[]) =>
  ({
    find: ({ where }: { where?: Partial<T> } = {}) =>
      Promise.resolve(
        rows.filter(
          (r) =>
            !where ||
            Object.entries(where).every(
              ([k, v]) => (r as Record<string, unknown>)[k] === v,
            ),
        ),
      ),
    findOne: ({ where }: { where: Partial<T> }) =>
      Promise.resolve(
        rows.find((r) =>
          Object.entries(where).every(
            ([k, v]) => (r as Record<string, unknown>)[k] === v,
          ),
        ) ?? null,
      ),
  }) as unknown as Repository<T>;

const advance = (
  id: string,
  estateId: number,
  amount: string,
  status: EstateAdvanceEntity['status'],
) => ({
  id,
  estateId,
  estateName: `Estate ${estateId}`,
  amount,
  reason: 'r',
  dateIssued: '2026-05-30',
  issuedBy: 'A. Bandara',
  status,
  createdAt: new Date(),
});

const settlement = (
  id: string,
  estateId: number,
  period: string,
  status: 'pending' | 'processed',
  advanceDeduction: string,
) => ({ id, estateId, period, status, advanceDeduction }) as SettlementEntity;

describe('EstateAdvanceViewService.detail', () => {
  const facts = new Map([
    [
      3,
      {
        ownerName: 'P. Jayasuriya',
        routeId: 2,
        route: 'Route B',
        paymentMethod: 'bank' as const,
        active: true,
      },
    ],
    [
      1,
      {
        ownerName: 'K. Silva',
        routeId: 1,
        route: 'Route A',
        paymentMethod: 'bank' as const,
        active: true,
      },
    ],
  ]);
  const service = new EstateAdvanceViewService(
    // only toPublicAdvance is used — it's pure
    Object.create(EstatesService.prototype) as EstatesService,
    {
      estateFacts: () => Promise.resolve(facts),
    } as unknown as SettlementViewService,
    repo([
      advance('EADV-2026-0022', 3, '40000.00', 'deducted'),
      advance('EADV-2026-0031', 1, '50000.00', 'pending_deduction'),
    ]),
    repo<EstateAdvanceRecoveryEntity>([
      {
        id: 1,
        advanceId: 'EADV-2026-0022',
        settlementId: 'SET-2026-06-003',
        amount: '40000.00',
        recoveredAt: new Date('2026-07-01T00:00:00Z'),
        createdAt: new Date(),
      },
    ]),
    repo([
      settlement('SET-2026-06-003', 3, 'June 2026', 'processed', '40000'),
      settlement('SET-2026-07-001', 1, 'July 2026', 'pending', '50000'),
    ]),
  );

  it('names the settlement that recovered each part, and has nothing planned once recovered', async () => {
    const d = await service.detail('EADV-2026-0022');
    expect(d.advance.remaining).toBe(0);
    expect(d.advance.recovery).toBe('Deducted');
    expect(d.recoveries).toEqual([
      {
        settlementId: 'SET-2026-06-003',
        period: 'June 2026',
        amount: 40000,
        recoveredAt: '2026-07-01T00:00:00.000Z',
      },
    ]);
    expect(d.planned).toBeNull();
  });

  it('shows the pending settlement that carries the deduction as planned, not recovered', async () => {
    const d = await service.detail('EADV-2026-0031');
    expect(d.recoveries).toEqual([]);
    expect(d.advance.ownerName).toBe('K. Silva');
    expect(d.planned).toEqual({
      settlementId: 'SET-2026-07-001',
      period: 'July 2026',
      advanceDeduction: 50000,
    });
  });

  it('404s an unknown reference', async () => {
    await expect(service.detail('EADV-X')).rejects.toThrow(NotFoundException);
  });
});
