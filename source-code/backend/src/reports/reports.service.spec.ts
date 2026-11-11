import { ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { PayrollRunEntity } from '../employees/payroll-run.entity';
import type { FertilizerBatchEntity } from '../fertilizer/fertilizer-batch.entity';
import type { StockMovementEntity } from '../fertilizer/stock-movement.entity';
import type { ExpenseEntryEntity } from './expense-entry.entity';
import type { LeafPurchaseService } from './leaf-purchase.service';
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
  let payrollRepo: FakeRepository<PayrollRunEntity>;
  let expenseRepo: FakeRepository<ExpenseEntryEntity>;
  let movementRepo: FakeRepository<StockMovementEntity>;
  let batchRepo: FakeRepository<FertilizerBatchEntity>;
  let service: ReportsService;
  /** what the Leaf Purchase report would say per month */
  let leafByMonth: Map<string, number>;

  const officer: Actor = { name: 'S. Fernando', role: 'Officer' };
  const manager: Actor = { name: 'R. Jayasuriya', role: 'Manager' };

  beforeEach(() => {
    leafByMonth = new Map();
    payrollRepo = new FakeRepository();
    expenseRepo = new FakeRepository();
    movementRepo = new FakeRepository();
    batchRepo = new FakeRepository();

    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ReportsService(
      expenseRepo as unknown as Repository<ExpenseEntryEntity>,
      payrollRepo as unknown as Repository<PayrollRunEntity>,
      movementRepo as unknown as Repository<StockMovementEntity>,
      batchRepo as unknown as Repository<FertilizerBatchEntity>,
      audit as unknown as import('../audit/audit.service').AuditService,
      {
        valueByMonth: () => Promise.resolve(leafByMonth),
      } as unknown as LeafPurchaseService,
    );
  });

  // RPT-01 — Collection: see collection-report-rules.spec.ts

  // RPT-02 — Leaf Purchase: see leaf-purchase-rules.spec.ts

  describe('expenseReport — RPT-03/04', () => {
    it('unions green leaf purchases, payroll and manual entries; settlement deductions are not expenses', async () => {
      payrollRepo.seed(makePayroll({ id: 'PR-1', gross: '80000.00' }));
      leafByMonth.set('2026-07', 754821);
      expenseRepo.seed(
        makeExpense({ id: 'EXP-1', category: 'Utilities', amount: '5000.00' }),
      );

      const report = await service.expenseReport('2026-07');
      expect(report.total).toBe(754821 + 80000 + 5000);
      expect(report.manualTotal).toBe(5000);
      expect(report.split).toEqual([
        { category: 'Green leaf purchases', amount: 754821 },
        { category: 'Payroll', amount: 80000 },
        { category: 'Utilities', amount: 5000 },
      ]);
      // fertilizer / transport recoveries belong to the Leaf Purchase report, never here
      expect(report.split.map((x) => x.category)).not.toContain('Fertilizer');
      expect(report.split.map((x) => x.category)).not.toContain('Transport');
      expect(
        report.rows.find((r) => r.category === 'Green leaf purchases'),
      ).toMatchObject({
        amount: 754821,
        source: 'Leaf Purchase Report',
      });
    });

    it('shows write-offs as "Stock lost" without counting them as an expense', async () => {
      payrollRepo.seed(makePayroll({ id: 'PR-1', gross: '80000.00' }));
      batchRepo.seed({
        id: 7,
        item: 'Muriate of Potash',
      } as FertilizerBatchEntity);
      for (const [id, qty, date] of [
        [1, '200.00', '2026-07-05'],
        [2, '100.00', '2026-07-20'],
        [3, '50.00', '2026-08-01'], // another month
      ] as const) {
        movementRepo.seed({
          id,
          batchId: 7,
          type: 'Write-off',
          writeOffReason: 'expired',
          quantityKg: qty,
          movementDate: date,
        } as StockMovementEntity);
      }

      const report = await service.expenseReport('2026-07');
      expect(report.stockLost).toEqual([
        { item: 'Muriate of Potash', reason: 'expired', kg: 300 },
      ]);
      expect(report.total).toBe(80000);
      expect(report.split).toEqual([{ category: 'Payroll', amount: 80000 }]);
    });

    it('groups multiple manual entries in the same category together', async () => {
      expenseRepo.seed(
        makeExpense({
          id: 'EXP-1',
          category: 'Miscellaneous',
          amount: '1000.00',
        }),
      );
      expenseRepo.seed(
        makeExpense({
          id: 'EXP-2',
          category: 'Miscellaneous',
          amount: '2000.00',
        }),
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
