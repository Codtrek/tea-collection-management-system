import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AppRole } from '../auth/role-map';
import { PayrollRunEntity } from '../employees/payroll-run.entity';
import { FertilizerBatchEntity } from '../fertilizer/fertilizer-batch.entity';
import { StockMovementEntity } from '../fertilizer/stock-movement.entity';
import { localDate } from '../dispatch/dispatch-map';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { LeafPurchaseService } from './leaf-purchase.service';
import { ExpenseEntryEntity } from './expense-entry.entity';
import {
  formatExpenseId,
  keyToLabel,
  labelToKey,
  monthKeyOfDate,
  prevMonthKey,
  shortMonth,
  type ExpenseReport,
  type ExpenseRow,
  type PublicExpenseEntry,
  type TrendPoint,
} from './reports-map';

export interface Actor {
  name: string;
  role: AppRole;
}

function groupBy<T>(
  items: T[],
  keyOf: (item: T) => string,
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyOf(item);
    (out[key] ??= []).push(item);
  }
  return out;
}

function sumBy<T>(items: T[], valueOf: (item: T) => number): number {
  return items.reduce((sum, item) => sum + valueOf(item), 0);
}

/** Lexicographic max works directly on 'YYYY-MM' keys. */
function latestKey(keys: string[]): string | null {
  return keys.length ? keys.sort().at(-1)! : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ExpenseEntryEntity)
    private readonly expenseRepo: Repository<ExpenseEntryEntity>,
    @InjectRepository(PayrollRunEntity)
    private readonly payrollRepo: Repository<PayrollRunEntity>,
    @InjectRepository(StockMovementEntity)
    private readonly movementRepo: Repository<StockMovementEntity>,
    @InjectRepository(FertilizerBatchEntity)
    private readonly batchRepo: Repository<FertilizerBatchEntity>,
    private readonly audit: AuditService,
    private readonly leaf: LeafPurchaseService,
  ) {}

  // RPT-01 — Collection lives in CollectionReportService (collection-report-rules.ts).

  // RPT-02 — the Leaf Purchase Report lives in LeafPurchaseService (leaf-purchase-rules.ts).

  // ── RPT-03/04 — Expenses ─────────────────────────────────────────
  // Payroll is DERIVED from payroll_runs and green leaf purchases from the Leaf Purchase report
  // (accrued value at the grade rates in force); only manual (Utilities/Maintenance/Miscellaneous/
  // Other) entries live in expense_entries. Settlement fertilizer and transport deductions are NOT
  // expenses — they are recovered from owners' leaf payments and shown as deductions on the Leaf
  // Purchase report, so one number never appears under two names.

  async expenseReport(period?: string): Promise<ExpenseReport> {
    const [payrollRuns, manual, leafByMonth] = await Promise.all([
      this.payrollRepo.find(),
      this.expenseRepo.find(),
      this.leaf.valueByMonth({ from: '2000-01-01', to: localDate(new Date()) }),
    ]);

    const payrollByPeriod = groupBy(payrollRuns, (p) => labelToKey(p.period));
    const manualByPeriod = groupBy(manual, (e) => monthKeyOfDate(e.entryDate));

    const allKeys = new Set([
      ...Object.keys(payrollByPeriod),
      ...leafByMonth.keys(),
      ...Object.keys(manualByPeriod),
    ]);
    const resolvedPeriod =
      period ?? latestKey([...allKeys]) ?? monthKeyOfDate(new Date());

    const payrollSum = sumBy(payrollByPeriod[resolvedPeriod] ?? [], (p) =>
      Number(p.gross),
    );
    const leafSum = leafByMonth.get(resolvedPeriod) ?? 0;
    const manualRows = manualByPeriod[resolvedPeriod] ?? [];
    const manualByCategory = new Map<string, number>();
    for (const e of manualRows) {
      manualByCategory.set(
        e.category,
        (manualByCategory.get(e.category) ?? 0) + Number(e.amount),
      );
    }

    const split = [
      { category: 'Green leaf purchases', amount: leafSum },
      { category: 'Payroll', amount: payrollSum },
      ...[...manualByCategory.entries()].map(([category, amount]) => ({
        category,
        amount,
      })),
    ].filter((s) => s.amount > 0);

    const total = split.reduce((s, c) => s + c.amount, 0);
    const manualTotal = sumBy(manualRows, (e) => Number(e.amount));
    const largest = split.length
      ? split.reduce((a, b) => (b.amount > a.amount ? b : a))
      : null;

    const trendTotalFor = (key: string) =>
      sumBy(payrollByPeriod[key] ?? [], (p) => Number(p.gross)) +
      (leafByMonth.get(key) ?? 0) +
      sumBy(manualByPeriod[key] ?? [], (e) => Number(e.amount));

    const trend: TrendPoint[] = [...allKeys]
      .sort()
      .map((key) => ({ month: shortMonth(key), value: trendTotalFor(key) }));

    const prevKey = prevMonthKey(resolvedPeriod);
    const prevTotal = allKeys.has(prevKey) ? trendTotalFor(prevKey) : null;
    const deltaPercent =
      prevTotal !== null && prevTotal > 0
        ? round1(((total - prevTotal) / prevTotal) * 100)
        : null;

    const rows: ExpenseRow[] = [];
    if (leafSum > 0) {
      rows.push({
        id: `LEAF-${resolvedPeriod}`,
        category: 'Green leaf purchases',
        description: `Green leaf purchases — ${keyToLabel(resolvedPeriod)} (accrued at the grade rates in force)`,
        amount: leafSum,
        date: `${resolvedPeriod}-01`,
        enteredBy: 'System',
        source: 'Leaf Purchase Report',
      });
    }
    if (payrollSum > 0) {
      rows.push({
        id: `PR-${resolvedPeriod}`,
        category: 'Payroll',
        description: `${keyToLabel(resolvedPeriod)} payroll run`,
        amount: payrollSum,
        date: `${resolvedPeriod}-15`,
        enteredBy: 'System',
        source: 'Payroll run',
      });
    }
    for (const e of manualRows) {
      rows.push({
        id: e.id,
        category: e.category,
        description: e.description,
        amount: Number(e.amount),
        date: e.entryDate,
        enteredBy: e.enteredBy,
        source: 'Manual',
      });
    }
    rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    return {
      period: resolvedPeriod,
      total,
      manualTotal,
      largest,
      deltaPercent,
      split,
      trend,
      rows,
      stockLost: await this.stockLost(resolvedPeriod),
    };
  }

  /** Fertilizer written off in the month, per item and reason (kg). Never an expense. */
  private async stockLost(period: string): Promise<ExpenseReport['stockLost']> {
    const [writeOffs, batches] = await Promise.all([
      this.movementRepo.find({ where: { type: 'Write-off' } }),
      this.batchRepo.find(),
    ]);
    const itemOf = new Map(batches.map((b) => [b.id, b.item]));
    const byKey = new Map<
      string,
      { item: string; reason: string; kg: number }
    >();
    for (const m of writeOffs) {
      if (monthKeyOfDate(m.movementDate) !== period) continue;
      const item = itemOf.get(m.batchId) ?? 'Unknown item';
      const reason = m.writeOffReason ?? 'other';
      const key = `${item}|${reason}`;
      const row = byKey.get(key) ?? { item, reason, kg: 0 };
      row.kg = Math.round((row.kg + Number(m.quantityKg)) * 100) / 100;
      byKey.set(key, row);
    }
    return [...byKey.values()].sort(
      (a, b) =>
        a.item.localeCompare(b.item) || a.reason.localeCompare(b.reason),
    );
  }

  /** RPT-04 — Officer+ (Manager is read-only, same tier as every other module). */
  async createExpense(
    dto: CreateExpenseDto,
    actor: Actor,
  ): Promise<PublicExpenseEntry> {
    this.assertCanWrite(actor);
    const year = new Date(dto.date).getFullYear();
    const seq = (await this.expenseRepo.count()) + 1;
    const entry = this.expenseRepo.create({
      id: formatExpenseId(year, seq),
      category: dto.category,
      description: dto.description,
      amount: String(dto.amount),
      entryDate: dto.date,
      enteredBy: actor.name,
    });
    const saved = await this.expenseRepo.save(entry);
    await this.audit.record(actor, {
      action: 'Logged daily expense',
      module: 'Reports',
      record: saved.id,
      recordHref: '/reports/expenses',
      details: `${dto.category} · Rs. ${dto.amount} — ${dto.description}`,
    });
    return this.toPublicExpense(saved);
  }

  private assertCanWrite(actor: Actor): void {
    if (actor.role === 'Manager') {
      throw new ForbiddenException(
        'Managers have read-only access to this resource.',
      );
    }
  }

  private toPublicExpense(entity: ExpenseEntryEntity): PublicExpenseEntry {
    return {
      id: entity.id,
      category: entity.category,
      description: entity.description,
      amount: Number(entity.amount),
      date: entity.entryDate,
      enteredBy: entity.enteredBy,
      source: 'Manual',
    };
  }
}
