import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { EstateAdvancePlanService } from './estate-advance-plan.service';
import type { EstateAdvanceRecoveryEntity } from './estate-advance-recovery.entity';
import {
  DEFAULT_ESTATE_ADVANCE_SETTINGS,
  type EstateAdvanceSettingsService,
} from './estate-advance-settings.service';
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
  installmentAmount: string,
  startPeriod: string,
): EstateAdvanceEntity => ({
  id,
  estateId,
  estateName: `Estate ${estateId}`,
  amount,
  reason: 'r',
  dateIssued: '2026-05-30',
  issuedBy: 'A. Bandara',
  status,
  installmentAmount,
  installmentMonths: Math.ceil(Number(amount) / Number(installmentAmount)),
  startPeriod,
  createdAt: new Date(),
});

const recovery = (
  advanceId: string,
  settlementId: string,
  period: string,
  planned: string,
  amount: string,
): EstateAdvanceRecoveryEntity => ({
  id: Math.random(),
  advanceId,
  settlementId,
  kind: 'settlement',
  period,
  plannedAmount: planned,
  amount,
  status: 'recovered',
  reference: null,
  paidOn: null,
  recordedBy: 'O',
  recoveredAt: new Date('2026-07-01T00:00:00Z'),
  createdAt: new Date(),
});

const settlement = (
  id: string,
  estateId: number,
  period: string,
  status: 'pending' | 'processed',
  gross: number,
  advanceDeduction = '0',
) =>
  ({
    id,
    estateId,
    period,
    status,
    superKg: String(gross),
    superRate: '1',
    normalKg: '0',
    normalRate: '0',
    transportCost: '0',
    fertilizerDeduction: '0',
    advanceDeduction,
    adjustmentAmount: '0',
  }) as SettlementEntity;

describe('EstateAdvanceViewService', () => {
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
        active: false,
      },
    ],
  ]);
  const estates = Object.create(EstatesService.prototype) as EstatesService;
  estates.findById = (id: string) =>
    Promise.resolve({
      id,
      estateName: id === 'EST-0001' ? 'Green Valley' : 'Mount Rest',
      status: id === 'EST-0001' ? 'Inactive' : 'Active',
    } as never);
  const service = new EstateAdvanceViewService(
    estates,
    {
      estateFacts: () => Promise.resolve(facts),
    } as unknown as SettlementViewService,
    {
      reschedules: () => Promise.resolve([]),
    } as unknown as EstateAdvancePlanService,
    {
      get: () => Promise.resolve(DEFAULT_ESTATE_ADVANCE_SETTINGS),
    } as unknown as EstateAdvanceSettingsService,
    repo([
      advance(
        'EADV-2026-0022',
        3,
        '40000.00',
        'deducted',
        '40000',
        'June 2026',
      ),
      advance(
        'EADV-2026-0031',
        1,
        '50000.00',
        'recovering',
        '20000',
        'July 2026',
      ),
    ]),
    repo([
      recovery(
        'EADV-2026-0022',
        'SET-2026-06-003',
        'June 2026',
        '40000',
        '40000',
      ),
      recovery(
        'EADV-2026-0031',
        'SET-2026-07-001',
        'July 2026',
        '20000',
        '5000',
      ),
    ]),
    repo([
      settlement('SET-2026-04-001', 3, 'April 2026', 'processed', 30000),
      settlement('SET-2026-05-001', 3, 'May 2026', 'processed', 40000),
      settlement(
        'SET-2026-06-003',
        3,
        'June 2026',
        'processed',
        80000,
        '40000',
      ),
      settlement('SET-2026-03-001', 3, 'March 2026', 'processed', 99999),
      settlement('SET-2026-07-001', 1, 'July 2026', 'processed', 9000, '5000'),
      settlement('SET-2026-08-001', 1, 'August 2026', 'pending', 9000),
    ]),
  );

  it('a recovered advance: its one period, linked to the settlement that took it', async () => {
    const d = await service.detail('EADV-2026-0022');
    expect(d.advance.recovery).toBe('Deducted');
    expect(d.advance.nextPeriod).toBeNull();
    expect(d.schedule).toEqual([
      {
        period: 'June 2026',
        planned: 40000,
        deducted: 40000,
        carried: 0,
        status: 'Deducted',
        settlementId: 'SET-2026-06-003',
        settlementStatus: 'Processed',
      },
    ]);
  });

  it('a short period carries forward; later periods link to their settlement when one exists', async () => {
    const d = await service.detail('EADV-2026-0031');
    expect(d.advance.recovery).toBe('Recovering');
    expect(d.advance.carriedForward).toBe(15000);
    expect(d.advance.estateInactive).toBe(true);
    expect(
      d.schedule.map((m) => [
        m.period,
        m.planned,
        m.deducted,
        m.status,
        m.settlementId,
      ]),
    ).toEqual([
      ['July 2026', 20000, 5000, 'Deducted', 'SET-2026-07-001'],
      ['August 2026', 20000, 0, 'Planned', 'SET-2026-08-001'],
      ['September 2026', 20000, 0, 'Planned', null],
      ['October 2026', 5000, 0, 'Planned', null],
    ]);
  });

  it('advance context: open balance and the average net of the last 3 processed settlements', async () => {
    const c = await service.context('EST-0003');
    expect(c.outstandingAdvanceRs).toBe(0);
    expect(c.averagePeriods).toEqual(['June 2026', 'May 2026', 'April 2026']);
    expect(c.averageNetRs).toBe(Math.round((40000 + 40000 + 30000) / 3));
    const g = await service.context('EST-0001');
    expect(g.active).toBe(false);
    expect(g.openAdvances).toEqual([
      { id: 'EADV-2026-0031', remaining: 45000, nextPeriod: 'August 2026' },
    ]);
  });

  it('404s an unknown reference', async () => {
    await expect(service.detail('EADV-X')).rejects.toThrow(NotFoundException);
  });
});
