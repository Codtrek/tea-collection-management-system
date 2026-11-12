import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { PermissionLevel } from '../admin/admin-map';
import type { SystemSettingEntity } from '../admin/system-setting.entity';
import type { AuditService } from '../audit/audit.service';
import type { DispatchAccessService } from '../dispatch/dispatch-access.service';
import type { ExpenseCategoryEntity } from './expense-category.entity';
import type { ExpenseEntryEntity } from './expense-entry.entity';
import type { ExpenseReceiptEntity } from './expense-receipt.entity';
import { type Actor, ReportsService } from './reports.service';

/** RPT-04 daily expense entries — permissions, the edit window and the audit trail. */

class FakeRepo<T extends object> {
  rows: T[] = [];
  seq = 136;
  constructor(private readonly key: keyof T) {}
  find(): Promise<T[]> {
    return Promise.resolve([...this.rows]);
  }
  findOne(o: { where: Partial<T> }): Promise<T | null> {
    const hit = this.rows.find((r) =>
      Object.entries(o.where).every(([k, v]) => r[k as keyof T] === v),
    );
    return Promise.resolve(hit ?? null);
  }
  create(p: Partial<T>): T {
    return { ...p } as T;
  }
  save(r: T): Promise<T> {
    const row = r as Record<string, unknown>;
    if (this.key === 'id' && row.id === undefined)
      row.id = this.rows.length + 1;
    const i = this.rows.findIndex((x) => x[this.key] === r[this.key]);
    if (i >= 0) this.rows[i] = r;
    else this.rows.push(r);
    return Promise.resolve(r);
  }
  query(): Promise<{ seq: string }[]> {
    return Promise.resolve([{ seq: String(++this.seq) }]);
  }
}

const LEVELS: Record<string, Record<string, PermissionLevel>> = {
  Officer: { expenses: 'edit', administration: 'none' },
  Manager: { expenses: 'approve', administration: 'none' },
  Administrator: { expenses: 'view', administration: 'approve' },
};
const ORDER: PermissionLevel[] = ['none', 'view', 'edit', 'approve'];
const levelOf = (role: string, module: string): PermissionLevel =>
  LEVELS[role]?.[module] ?? 'none';
const access = {
  levelFor: (role: string, module: string) =>
    Promise.resolve(levelOf(role, module)),
  require: (
    role: string,
    needed: PermissionLevel,
    what: string,
    module: string,
  ) =>
    ORDER.indexOf(levelOf(role, module)) < ORDER.indexOf(needed)
      ? Promise.reject(new ForbiddenException(`Your role may not ${what}.`))
      : Promise.resolve(),
};

const officer: Actor = { name: 'S. Fernando', role: 'Officer', sub: 2 };
const otherOfficer: Actor = { name: 'P. Silva', role: 'Officer', sub: 5 };
const manager: Actor = { name: 'R. Jayasuriya', role: 'Manager', sub: 3 };
const admin: Actor = { name: 'A. Perera', role: 'Administrator', sub: 1 };

const NOV_10 = new Date('2026-11-10T09:00:00+05:30');
const NOV_15 = new Date('2026-11-15T09:00:00+05:30');
const NOV_20 = new Date('2026-11-20T09:00:00+05:30');

describe('ReportsService — daily expense entries', () => {
  let entries: FakeRepo<ExpenseEntryEntity>;
  let categories: FakeRepo<ExpenseCategoryEntity>;
  let audit: { record: jest.Mock };
  let service: ReportsService;

  beforeEach(() => {
    entries = new FakeRepo<ExpenseEntryEntity>('id');
    categories = new FakeRepo<ExpenseCategoryEntity>('id');
    const receipts = new FakeRepo<ExpenseReceiptEntity>('entryId');
    categories.rows = [
      { id: 1, name: 'Electricity', active: true, sortOrder: 2 },
      { id: 2, name: 'Water', active: true, sortOrder: 3 },
      { id: 3, name: 'Utilities', active: false, sortOrder: 99 },
    ] as ExpenseCategoryEntity[];
    const settings = new FakeRepo<SystemSettingEntity>('key');
    settings.rows = [
      { key: 'expenses', value: { editWindowDays: 7 } } as SystemSettingEntity,
    ];
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ReportsService(
      entries as unknown as Repository<ExpenseEntryEntity>,
      categories as unknown as Repository<ExpenseCategoryEntity>,
      receipts as unknown as Repository<ExpenseReceiptEntity>,
      settings as unknown as Repository<SystemSettingEntity>,
      access as unknown as DispatchAccessService,
      audit as unknown as AuditService,
    );
  });

  const log = (
    actor = officer,
    now = NOV_10,
    o: Partial<{ categoryId: number; date: string }> = {},
  ) =>
    service.createExpense(
      {
        categoryId: 1,
        amount: 52000,
        date: '2026-11-10',
        description: 'CEB electricity — factory floor',
        paidVia: 'bank',
        ...o,
      },
      actor,
      now,
    );

  it('an Officer logs an entry: id from the sequence, creator stamped, audited', async () => {
    const e = await log();
    expect(e).toMatchObject({
      id: 'EXP-2026-0137',
      category: 'Electricity',
      paidVia: 'bank',
      enteredBy: 'S. Fernando',
      loggedOn: '2026-11-10',
      access: { canEdit: true, needsReason: false },
    });
    expect(entries.rows[0].createdByUserId).toBe(2);
    expect(audit.record).toHaveBeenCalledWith(
      officer,
      expect.objectContaining({
        action: 'Logged daily expense',
        record: 'EXP-2026-0137',
        details: expect.stringContaining('Electricity · Rs. 52,000') as string,
      }),
    );
  });

  it('rejects a future date and an inactive category', async () => {
    await expect(log(officer, NOV_10, { date: '2026-11-11' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(log(officer, NOV_10, { categoryId: 3 })).rejects.toThrow(
      /no longer in use/,
    );
  });

  it('the Administrator views but cannot log', async () => {
    await expect(log(admin)).rejects.toThrow(ForbiddenException);
  });

  it('the creator edits within the window; the change is audited before → after', async () => {
    const { id } = await log();
    const e = await service.updateExpense(
      id,
      { amount: 52500 },
      officer,
      NOV_15,
    );
    expect(e.amount).toBe(52500);
    expect(e.updatedBy).toBe('S. Fernando');
    expect(audit.record).toHaveBeenLastCalledWith(
      officer,
      expect.objectContaining({
        action: 'Changed daily expense',
        details: 'Amount: Rs. 52,000 → Rs. 52,500',
      }),
    );
  });

  it('after the window only the Manager may change it, with a reason', async () => {
    const { id } = await log();
    await expect(
      service.updateExpense(id, { amount: 1 }, officer, NOV_20),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.updateExpense(id, { amount: 51000 }, manager, NOV_20),
    ).rejects.toThrow(/reason/);
    const e = await service.updateExpense(
      id,
      { amount: 51000, reason: 'CEB bill re-issued' },
      manager,
      NOV_20,
    );
    expect(e).toMatchObject({
      amount: 51000,
      editReason: 'CEB bill re-issued',
    });
    expect(audit.record).toHaveBeenLastCalledWith(
      manager,
      expect.objectContaining({
        details: 'Amount: Rs. 52,000 → Rs. 51,000 — reason: CEB bill re-issued',
      }),
    );
  });

  it('another Officer can’t change someone else’s entry', async () => {
    const { id } = await log();
    await expect(
      service.updateExpense(id, { amount: 1 }, otherOfficer, NOV_15),
    ).rejects.toThrow(ForbiddenException);
    const seen = await service.getExpense(id, otherOfficer, NOV_15);
    expect(seen.access.canEdit).toBe(false);
  });

  it('a receipt: photo or PDF up to 2 MB, audited', async () => {
    const { id } = await log();
    const file = (size: number, mimetype = 'image/jpeg') => ({
      originalname: 'ceb.jpg',
      mimetype,
      size,
      buffer: Buffer.alloc(size),
    });
    await expect(
      service.saveReceipt(
        id,
        file(3 * 1024 * 1024),
        undefined,
        officer,
        NOV_10,
      ),
    ).rejects.toThrow(/2 MB/);
    await expect(
      service.saveReceipt(
        id,
        file(10, 'text/plain'),
        undefined,
        officer,
        NOV_10,
      ),
    ).rejects.toThrow(/photo/);
    const e = await service.saveReceipt(
      id,
      file(2048),
      undefined,
      officer,
      NOV_10,
    );
    expect(e.receipt).toEqual({
      fileName: 'ceb.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 2048,
    });
    expect(audit.record).toHaveBeenLastCalledWith(
      officer,
      expect.objectContaining({ action: 'Attached expense receipt' }),
    );
  });

  it('categories: Administrator only, unique names, audited', async () => {
    await expect(
      service.createCategory({ name: 'Packaging' }, officer),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.createCategory({ name: 'water' }, admin),
    ).rejects.toThrow(ConflictException);
    const list = await service.createCategory({ name: 'Packaging' }, admin);
    expect(list.map((c) => c.name)).toContain('Packaging');
    await service.updateCategory(2, { active: false }, admin);
    expect(categories.rows.find((c) => c.id === 2)?.active).toBe(false);
    expect(audit.record).toHaveBeenLastCalledWith(
      admin,
      expect.objectContaining({ details: 'In use: yes → no' }),
    );
  });
});
