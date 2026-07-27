import { ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { CollectionRecordEntity } from '../collections/collection-record.entity';
import type { PayrollRunEntity } from '../employees/payroll-run.entity';
import type { SettlementEntity } from '../estates/settlement.entity';
import type { ExpenseEntryEntity } from './expense-entry.entity';
import { type Actor, ReportsService } from './reports.service';

/** Minimal in-memory stand-in for the TypeORM Repository surface the service uses. */
class FakeRepository<T extends { id: string | number }> {
  private readonly store = new Map<string | number, T>();

  seed(record: T): void {
    this.store.set(record.id, record);
  }

  find(where?: { where: Partial<T> }): Promise<T[]> {
    if (!where) return Promise.resolve([...this.store.values()]);
    const [key, value] = Object.entries(where.where)[0] as [keyof T, unknown];
    return Promise.resolve(
      [...this.store.values()].filter((r) => r[key] === value),
    );
  }

  count(): Promise<number> {
    return Promise.resolve(this.store.size);
  }

  create(partial: Partial<T>): T {
    return partial as T;
  }

  save(record: T): Promise<T> {
    const withCreatedAt = { createdAt: new Date(), ...record } as T;
    this.store.set(withCreatedAt.id, withCreatedAt);
    return Promise.resolve(withCreatedAt);
  }
}

function makeCollection(
  overrides: Partial<CollectionRecordEntity> = {},
): CollectionRecordEntity {
  return {
    id: 'GV-2026-0714',
    estateId: 1,
    estateRef: 'EST-0001',
    estateName: 'Green Valley Estate',
    routeId: 1,
    routeName: 'Route 3',
    weightKg: '210.00',
    grade: 'super',
    status: 'confirmed',
    collectionDate: '2026-07-14',
    agentId: 1,
    agentName: 'R. Senanayake',
    photos: [],
    timeline: [],
    provisional: null,
    mismatch: null,
    lastUpdatedBy: null,
    lastUpdatedOn: null,
    createdAt: new Date('2026-07-14T00:00:00.000Z'),
    ...overrides,
  } as CollectionRecordEntity;
}

function makeSettlement(
  overrides: Partial<SettlementEntity> = {},
): SettlementEntity {
  return {
    id: 'SET-2026-07-001',
    estateId: 1,
    estateName: 'Green Valley Estate',
    period: 'July 2026',
    superKg: '400.00',
    normalKg: '100.00',
    superRate: '185.00',
    normalRate: '95.00',
    transportCost: '8000.00',
    fertilizerDeduction: '20000.00',
    advanceDeduction: '0.00',
    status: 'processed',
    selfDelivery: false,
    missingBank: false,
    processedBy: 'A. Bandara',
    processedOn: new Date('2026-07-15T00:00:00.000Z'),
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  } as SettlementEntity;
}

function makePayroll(
  overrides: Partial<PayrollRunEntity> = {},
): PayrollRunEntity {
  return {
    id: 'PR-0001',
    employeeId: 1,
    employeeName: 'S. Fernando',
    period: 'July 2026',
    dayHours: '160.00',
    dayOtHours: '0.00',
    nightHours: '0.00',
    nightOtHours: '0.00',
    dayRate: '500.00',
    dayOtRate: '750.00',
    nightRate: '600.00',
    nightOtRate: '900.00',
    gross: '80000.00',
    deductionsAdvances: '0.00',
    deductionsOther: '0.00',
    status: 'Pending',
    missingBank: false,
    processedBy: null,
    processedOn: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  } as PayrollRunEntity;
}

function makeExpense(
  overrides: Partial<ExpenseEntryEntity> = {},
): ExpenseEntryEntity {
  return {
    id: 'EXP-2026-0001',
    category: 'Utilities',
    description: 'CEB electricity',
    amount: '214600.00',
    entryDate: '2026-07-10',
    enteredBy: 'S. Fernando',
    createdAt: new Date('2026-07-10T00:00:00.000Z'),
    ...overrides,
  } as ExpenseEntryEntity;
}

describe('ReportsService', () => {
  let collectionRepo: FakeRepository<CollectionRecordEntity>;
  let settlementRepo: FakeRepository<SettlementEntity>;
  let payrollRepo: FakeRepository<PayrollRunEntity>;
  let expenseRepo: FakeRepository<ExpenseEntryEntity>;
  let service: ReportsService;

  const officer: Actor = { name: 'S. Fernando', role: 'Officer' };
  const manager: Actor = { name: 'R. Jayasuriya', role: 'Manager' };

  beforeEach(() => {
    collectionRepo = new FakeRepository();
    settlementRepo = new FakeRepository();
    payrollRepo = new FakeRepository();
    expenseRepo = new FakeRepository();

    service = new ReportsService(
      expenseRepo as unknown as Repository<ExpenseEntryEntity>,
      collectionRepo as unknown as Repository<CollectionRecordEntity>,
      settlementRepo as unknown as Repository<SettlementEntity>,
      payrollRepo as unknown as Repository<PayrollRunEntity>,
    );
  });

  describe('collectionReport — RPT-01', () => {
    it('excludes non-Confirmed records from the totals', async () => {
      collectionRepo.seed(
        makeCollection({ id: 'A', status: 'confirmed', weightKg: '100.00' }),
      );
      collectionRepo.seed(
        makeCollection({
          id: 'B',
          status: 'pending_agent_confirmation',
          weightKg: '9999.00',
        }),
      );

      const report = await service.collectionReport('2026-07');
      expect(report.totalKg).toBe(100);
    });

    it('computes the grade split as a percentage of graded weight', async () => {
      collectionRepo.seed(
        makeCollection({ id: 'A', grade: 'super', weightKg: '300.00' }),
      );
      collectionRepo.seed(
        makeCollection({ id: 'B', grade: 'normal', weightKg: '100.00' }),
      );

      const report = await service.collectionReport('2026-07');
      expect(report.gradeSplit).toEqual({ superPct: 75, normalPct: 25 });
    });

    it('buckets the trend by month across the full confirmed history', async () => {
      collectionRepo.seed(
        makeCollection({
          id: 'A',
          collectionDate: '2026-06-10',
          weightKg: '50.00',
        }),
      );
      collectionRepo.seed(
        makeCollection({
          id: 'B',
          collectionDate: '2026-07-14',
          weightKg: '210.00',
        }),
      );

      const report = await service.collectionReport('2026-07');
      expect(report.trend).toEqual([
        { month: 'Jun', value: 50 },
        { month: 'Jul', value: 210 },
      ]);
    });

    it('defaults to the latest month with confirmed data when no period is given', async () => {
      collectionRepo.seed(
        makeCollection({ id: 'A', collectionDate: '2026-05-01' }),
      );
      collectionRepo.seed(
        makeCollection({ id: 'B', collectionDate: '2026-07-01' }),
      );

      const report = await service.collectionReport();
      expect(report.period).toBe('2026-07');
    });
  });

  describe('revenueReport — RPT-02', () => {
    it('excludes pending settlements — only processed revenue is realized', async () => {
      settlementRepo.seed(
        makeSettlement({ id: 'A', status: 'processed', superKg: '100.00', normalKg: '0.00', superRate: '185.00', normalRate: '95.00' }),
      );
      settlementRepo.seed(
        makeSettlement({ id: 'B', status: 'pending', superKg: '1000.00' }),
      );

      const report = await service.revenueReport('2026-07');
      expect(report.totalRevenue).toBe(18500); // 100 * 185
    });

    it('computes month-over-month delta against the previous period', async () => {
      settlementRepo.seed(
        makeSettlement({
          id: 'A',
          period: 'June 2026',
          superKg: '100.00',
          normalKg: '0.00',
          superRate: '100.00',
        }),
      );
      settlementRepo.seed(
        makeSettlement({
          id: 'B',
          period: 'July 2026',
          superKg: '150.00',
          normalKg: '0.00',
          superRate: '100.00',
        }),
      );

      const report = await service.revenueReport('2026-07');
      expect(report.prevRevenue).toBe(10000);
      expect(report.totalRevenue).toBe(15000);
      expect(report.deltaPercent).toBe(50);
    });
  });

  describe('expenseReport — RPT-03/04', () => {
    it('unions payroll, settlement, and manual entries for the period', async () => {
      payrollRepo.seed(makePayroll({ id: 'PR-1', gross: '80000.00' }));
      settlementRepo.seed(
        makeSettlement({
          id: 'SET-1',
          transportCost: '8000.00',
          fertilizerDeduction: '20000.00',
        }),
      );
      expenseRepo.seed(
        makeExpense({ id: 'EXP-1', category: 'Utilities', amount: '5000.00' }),
      );

      const report = await service.expenseReport('2026-07');
      expect(report.total).toBe(80000 + 8000 + 20000 + 5000);
      expect(report.manualTotal).toBe(5000);
      expect(report.rows).toHaveLength(4);
      expect(report.split).toEqual(
        expect.arrayContaining([
          { category: 'Payroll', amount: 80000 },
          { category: 'Transport', amount: 8000 },
          { category: 'Fertilizer', amount: 20000 },
          { category: 'Utilities', amount: 5000 },
        ]),
      );
    });

    it('groups multiple manual entries in the same category together', async () => {
      expenseRepo.seed(
        makeExpense({ id: 'EXP-1', category: 'Miscellaneous', amount: '1000.00' }),
      );
      expenseRepo.seed(
        makeExpense({ id: 'EXP-2', category: 'Miscellaneous', amount: '2000.00' }),
      );

      const report = await service.expenseReport('2026-07');
      const misc = report.split.find((s) => s.category === 'Miscellaneous');
      expect(misc?.amount).toBe(3000);
    });

    it('omits zero-amount categories from the split', async () => {
      const report = await service.expenseReport('2026-07');
      expect(report.split).toEqual([]);
      expect(report.largest).toBeNull();
    });
  });

  describe('createExpense', () => {
    it('rejects a Manager (read-only, same tier as every other module)', async () => {
      await expect(
        service.createExpense(
          {
            category: 'Utilities',
            amount: 1000,
            date: '2026-07-20',
            description: 'Test',
          },
          manager,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lets an Officer log an expense, stamping the actor as enteredBy', async () => {
      const entry = await service.createExpense(
        {
          category: 'Maintenance',
          amount: 4500,
          date: '2026-07-20',
          description: 'Fan replacement',
        },
        officer,
      );

      expect(entry.enteredBy).toBe('S. Fernando');
      expect(entry.id).toMatch(/^EXP-2026-\d{4}$/);
      expect(entry.amount).toBe(4500);
    });
  });
});
