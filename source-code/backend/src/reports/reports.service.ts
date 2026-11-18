import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSettingEntity } from '../admin/system-setting.entity';
import { AuditService } from '../audit/audit.service';
import type { AppRole } from '../auth/role-map';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { localDate } from '../dispatch/dispatch-map';
import type {
  CreateExpenseDto,
  ExpenseCategoryDto,
  UpdateExpenseDto,
} from './dto/create-expense.dto';
import { ExpenseCategoryEntity } from './expense-category.entity';
import {
  changeSummary,
  createError,
  editAccess,
  editError,
  type EditContext,
} from './expense-entry-rules';
import { ExpenseEntryEntity } from './expense-entry.entity';
import {
  formatExpenseId,
  type PublicExpenseCategory,
  type PublicExpenseEntry,
} from './reports-map';

export interface Actor {
  name: string;
  role: AppRole;
  /** users.id */
  sub: number | null;
}

const DEFAULT_EDIT_WINDOW_DAYS = 7;
const SETUP_HREF = '/admin/factory-setup';
const rs = (n: number | string) => {
  const v = Number(n);
  const d = Number.isInteger(v) ? 0 : 2;
  return `Rs. ${v.toLocaleString('en-LK', { minimumFractionDigits: d, maximumFractionDigits: 2 })}`;
};

/**
 * RPT-04 — daily expense entries and their categories (Finance-Reports-Addendum §6–7).
 * RPT-01 lives in CollectionReportService, RPT-02 in LeafPurchaseService and the Expense report
 * (RPT-03) in FinanceService. Permissions are data-driven: the `expenses` module (edit = log and
 * change your own entry within the window, approve = change any, with a reason) and
 * `administration` for the category list — never role names.
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ExpenseEntryEntity)
    private readonly expenseRepo: Repository<ExpenseEntryEntity>,
    @InjectRepository(ExpenseCategoryEntity)
    private readonly categoryRepo: Repository<ExpenseCategoryEntity>,
    @InjectRepository(SystemSettingEntity)
    private readonly settingsRepo: Repository<SystemSettingEntity>,
    private readonly access: DispatchAccessService,
    private readonly audit: AuditService,
  ) {}

  /** `system_settings.expenses.editWindowDays` — how long the creator may change an entry. */
  async editWindowDays(): Promise<number> {
    const row = await this.settingsRepo.findOne({ where: { key: 'expenses' } });
    const n = (row?.value as { editWindowDays?: unknown } | undefined)
      ?.editWindowDays;
    return typeof n === 'number' && Number.isInteger(n) && n >= 0
      ? n
      : DEFAULT_EDIT_WINDOW_DAYS;
  }

  /* ── Categories (ADM-01, Administrator) ── */

  async listCategories(): Promise<PublicExpenseCategory[]> {
    const rows = await this.categoryRepo.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      active: c.active,
      sortOrder: c.sortOrder,
    }));
  }

  async createCategory(
    dto: ExpenseCategoryDto,
    actor: Actor,
  ): Promise<PublicExpenseCategory[]> {
    await this.access.require(
      actor.role,
      'edit',
      'manage expense categories',
      'administration',
    );
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Give the category a name.');
    const all = await this.categoryRepo.find();
    this.assertUniqueName(all, name);
    const saved = await this.categoryRepo.save(
      this.categoryRepo.create({
        name,
        active: dto.active ?? true,
        sortOrder:
          dto.sortOrder ??
          all.reduce((m, c) => Math.max(m, c.active ? c.sortOrder : 0), 0) + 1,
        updatedBy: actor.name,
        updatedAt: new Date(),
      }),
    );
    await this.audit.record(actor, {
      action: 'Added expense category',
      module: 'Administration',
      record: saved.name,
      recordHref: SETUP_HREF,
      details: saved.name,
    });
    return this.listCategories();
  }

  async updateCategory(
    id: number,
    dto: ExpenseCategoryDto,
    actor: Actor,
  ): Promise<PublicExpenseCategory[]> {
    await this.access.require(
      actor.role,
      'edit',
      'manage expense categories',
      'administration',
    );
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Expense category ${id} not found.`);
    const shape = (c: ExpenseCategoryEntity) => ({
      name: c.name,
      active: c.active ? 'yes' : 'no',
      sortOrder: c.sortOrder,
    });
    const before = shape(cat);
    const name = dto.name?.trim();
    if (name && name.toLowerCase() !== cat.name.toLowerCase()) {
      this.assertUniqueName(await this.categoryRepo.find(), name);
    }
    if (name) cat.name = name;
    if (dto.active !== undefined) cat.active = dto.active;
    if (dto.sortOrder !== undefined) cat.sortOrder = dto.sortOrder;
    const details = changeSummary(before, shape(cat), {
      name: 'Name',
      active: 'In use',
      sortOrder: 'Order',
    });
    if (!details) return this.listCategories();
    cat.updatedBy = actor.name;
    cat.updatedAt = new Date();
    await this.categoryRepo.save(cat);
    await this.audit.record(actor, {
      action: 'Changed expense category',
      module: 'Administration',
      record: cat.name,
      recordHref: SETUP_HREF,
      details,
    });
    return this.listCategories();
  }

  private assertUniqueName(all: ExpenseCategoryEntity[], name: string): void {
    if (all.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new ConflictException(
        `A category called "${name}" already exists.`,
      );
    }
  }

  /* ── Entries ── */

  async getExpense(
    id: string,
    actor: Actor,
    now: Date = new Date(),
  ): Promise<PublicExpenseEntry> {
    await this.access.require(
      actor.role,
      'view',
      'view daily expenses',
      'expenses',
    );
    return this.toPublic(await this.findEntry(id), actor, now);
  }

  async createExpense(
    dto: CreateExpenseDto,
    actor: Actor,
    now: Date = new Date(),
  ): Promise<PublicExpenseEntry> {
    const why = createError(
      await this.access.levelFor(actor.role, 'expenses'),
      dto.date,
      localDate(now),
    );
    if (why) {
      throw why.includes('future')
        ? new BadRequestException(why)
        : new ForbiddenException(why);
    }
    const category = await this.activeCategory(dto.categoryId);
    const [{ seq }] = await this.expenseRepo.query<{ seq: string }[]>(
      `SELECT nextval('expense_entry_seq') AS seq`,
    );
    const description = dto.description.trim();
    const saved = await this.expenseRepo.save(
      this.expenseRepo.create({
        id: formatExpenseId(Number(dto.date.slice(0, 4)), Number(seq)),
        categoryId: category.id,
        description,
        amount: String(dto.amount),
        entryDate: dto.date,
        paidVia: dto.paidVia,
        enteredBy: actor.name,
        createdByUserId: actor.sub,
        createdAt: now,
      }),
    );
    await this.audit.record(actor, {
      action: 'Logged daily expense',
      module: 'Reports',
      record: saved.id,
      recordHref: `/reports/expenses/${saved.id}`,
      details: `${category.name} · ${rs(dto.amount)} · ${dto.date} · paid by ${dto.paidVia} — ${description}`,
    });
    return this.toPublic(saved, actor, now);
  }

  async updateExpense(
    id: string,
    dto: UpdateExpenseDto,
    actor: Actor,
    now: Date = new Date(),
  ): Promise<PublicExpenseEntry> {
    const entry = await this.findEntry(id);
    const ctx = await this.editContext(entry, actor, now);
    const why = editError(ctx, dto.date, dto.reason);
    if (why) throw this.refusal(ctx, why);
    if (dto.categoryId !== undefined && dto.categoryId !== entry.categoryId) {
      await this.activeCategory(dto.categoryId);
    }
    const names = new Map(
      (await this.categoryRepo.find()).map((c) => [c.id, c.name]),
    );
    const shape = (e: ExpenseEntryEntity) => ({
      category: names.get(e.categoryId) ?? '—',
      amount: rs(e.amount),
      date: e.entryDate,
      description: e.description,
      paidVia: e.paidVia,
    });
    const before = shape(entry);
    if (dto.categoryId !== undefined) entry.categoryId = dto.categoryId;
    if (dto.amount !== undefined) entry.amount = String(dto.amount);
    if (dto.date !== undefined) entry.entryDate = dto.date;
    if (dto.description !== undefined)
      entry.description = dto.description.trim();
    if (dto.paidVia !== undefined) entry.paidVia = dto.paidVia;
    const changes = changeSummary(before, shape(entry), {
      category: 'Category',
      amount: 'Amount',
      date: 'Date',
      description: 'Description',
      paidVia: 'Paid via',
    });
    if (!changes) return this.toPublic(entry, actor, now);

    const reason = editAccess(ctx).needsReason ? dto.reason!.trim() : null;
    entry.updatedBy = actor.name;
    entry.updatedAt = now;
    if (reason) entry.editReason = reason;
    const saved = await this.expenseRepo.save(entry);
    await this.audit.record(actor, {
      action: 'Changed daily expense',
      module: 'Reports',
      record: saved.id,
      recordHref: `/reports/expenses/${saved.id}`,
      details: reason ? `${changes} — reason: ${reason}` : changes,
    });
    return this.toPublic(saved, actor, now);
  }

  /* ── helpers ── */

  /** Not allowed at all → 403; allowed but the change is invalid (future date, no reason) → 400. */
  private refusal(ctx: EditContext, why: string) {
    return editAccess(ctx).allowed
      ? new BadRequestException(why)
      : new ForbiddenException(why);
  }

  private async findEntry(id: string): Promise<ExpenseEntryEntity> {
    const entry = await this.expenseRepo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException(`Expense ${id} not found.`);
    return entry;
  }

  private async activeCategory(id: number): Promise<ExpenseCategoryEntity> {
    const c = await this.categoryRepo.findOne({ where: { id } });
    if (!c) throw new BadRequestException('Pick an expense category.');
    if (!c.active) {
      throw new BadRequestException(
        `"${c.name}" is no longer in use — pick another category.`,
      );
    }
    return c;
  }

  private async editContext(
    entry: ExpenseEntryEntity,
    actor: Actor,
    now: Date,
  ): Promise<EditContext> {
    const [level, windowDays] = await Promise.all([
      this.access.levelFor(actor.role, 'expenses'),
      this.editWindowDays(),
    ]);
    return {
      level,
      isCreator:
        entry.createdByUserId !== null &&
        actor.sub !== null &&
        entry.createdByUserId === actor.sub,
      loggedOn: localDate(entry.createdAt ?? now),
      today: localDate(now),
      windowDays,
    };
  }

  private async toPublic(
    e: ExpenseEntryEntity,
    actor: Actor,
    now: Date,
  ): Promise<PublicExpenseEntry> {
    const [category, ctx] = await Promise.all([
      this.categoryRepo.findOne({ where: { id: e.categoryId } }),
      this.editContext(e, actor, now),
    ]);
    const a = editAccess(ctx);
    return {
      id: e.id,
      categoryId: e.categoryId,
      category: category?.name ?? '—',
      description: e.description,
      amount: Number(e.amount),
      date: e.entryDate,
      paidVia: e.paidVia,
      enteredBy: e.enteredBy,
      loggedOn: ctx.loggedOn,
      updatedBy: e.updatedBy,
      updatedAt: e.updatedAt ? new Date(e.updatedAt).toISOString() : null,
      editReason: e.editReason,
      access: { canEdit: a.allowed, needsReason: a.needsReason, note: a.note },
      editWindowDays: ctx.windowDays,
    };
  }
}
