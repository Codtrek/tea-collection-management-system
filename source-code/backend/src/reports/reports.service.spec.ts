import { ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
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

describe('ReportsService', () => {
  let expenseRepo: FakeRepository<ExpenseEntryEntity>;
  let service: ReportsService;

  const officer: Actor = { name: 'S. Fernando', role: 'Officer' };
  const manager: Actor = { name: 'R. Jayasuriya', role: 'Manager' };

  beforeEach(() => {
    expenseRepo = new FakeRepository();

    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ReportsService(
      expenseRepo as unknown as Repository<ExpenseEntryEntity>,
      audit as unknown as import('../audit/audit.service').AuditService,
    );
  });

  // RPT-01 — Collection: see collection-report-rules.spec.ts

  // RPT-02 — Leaf Purchase: see leaf-purchase-rules.spec.ts

  // RPT-03 — Expense report: see finance-rules.spec.ts

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
