import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AppRole } from '../auth/role-map';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { PayrollRunEntity } from '../employees/payroll-run.entity';
import { SettlementEntity } from '../estates/settlement.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseEntryEntity } from './expense-entry.entity';
import {
  formatExpenseId,
  keyToLabel,
  labelToKey,
  monthKeyOfDate,
  prevMonthKey,
  shortMonth,
  type CollectionReport,
  type ExpenseReport,
  type ExpenseRow,
  type PublicExpenseEntry,
  type RevenueReport,
  type TrendPoint,
} from './reports-map';

export interface Actor {
  name: string;
  role: AppRole;
}

function groupBy<T>(items: T[], keyOf: (item: T) => string): Record<string, T[]> {
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
    @InjectRepository(CollectionRecordEntity)
    private readonly collectionRepo: Repository<CollectionRecordEntity>,
    @InjectRepository(SettlementEntity)
    private readonly settlementRepo: Repository<SettlementEntity>,
    @InjectRepository(PayrollRunEntity)
    private readonly payrollRepo: Repository<PayrollRunEntity>,
  ) {}

  // ── RPT-01 — Collection ─────────────────────────────────────────
  // Confirmed records only (§ reports doc) — provisional entries never
  // inflate the numbers.

  async collectionReport(period?: string): Promise<CollectionReport> {
    const confirmed = await this.collectionRepo.find({
      where: { status: 'confirmed' },
    });
    const byMonth = groupBy(confirmed, (r) => monthKeyOfDate(r.collectionDate));
    const resolvedPeriod =
      period ?? latestKey(Object.keys(byMonth)) ?? monthKeyOfDate(new Date());
    const periodRecords = byMonth[resolvedPeriod] ?? [];

    const totalKg = sumBy(periodRecords, (r) => Number(r.weightKg));
    const estatesInPeriod = new Set(periodRecords.map((r) => r.estateName));
    const avgPerEstate = estatesInPeriod.size
      ? totalKg / estatesInPeriod.size
      : 0;

    // YTD, across every confirmed record — not scoped to `period`.
    const byEstateMap = new Map<string, number>();
    for (const r of confirmed) {
      byEstateMap.set(
        r.estateName,
        (byEstateMap.get(r.estateName) ?? 0) + Number(r.weightKg),
      );
    }
    const byEstate = [...byEstateMap.entries()]
      .map(([estate, kg]) => ({ estate, kg }))
      .sort((a, b) => b.kg - a.kg);
    const topEstate = byEstate[0] ?? null;

    const superKg = sumBy(
      periodRecords.filter((r) => r.grade === 'super'),
      (r) => Number(r.weightKg),
    );
    const normalKg = sumBy(
      periodRecords.filter((r) => r.grade === 'normal'),
      (r) => Number(r.weightKg),
    );
    const gradedTotal = superKg + normalKg;
    const gradeSplit = {
      superPct: gradedTotal ? Math.round((superKg / gradedTotal) * 100) : 0,
      normalPct: gradedTotal ? Math.round((normalKg / gradedTotal) * 100) : 0,
    };

    const trend: TrendPoint[] = Object.keys(byMonth)
      .sort()
      .map((key) => ({
        month: shortMonth(key),
        value: sumBy(byMonth[key], (r) => Number(r.weightKg)),
      }));

    const rowAcc = new Map<
      string,
      { deliveries: number; kg: number; superKg: number }
    >();
    for (const r of periodRecords) {
      const cur = rowAcc.get(r.estateName) ?? {
        deliveries: 0,
        kg: 0,
        superKg: 0,
      };
      cur.deliveries += 1;
      cur.kg += Number(r.weightKg);
      if (r.grade === 'super') cur.superKg += Number(r.weightKg);
      rowAcc.set(r.estateName, cur);
    }
    const rows = [...rowAcc.entries()]
      .map(([estate, v]) => ({
        estate,
        deliveries: v.deliveries,
        kg: v.kg,
        superPct: v.kg ? Math.round((v.superKg / v.kg) * 100) : 0,
      }))
      .sort((a, b) => b.kg - a.kg);

    return {
      period: resolvedPeriod,
      totalKg,
      avgPerEstate,
      topEstate,
      gradeSplit,
      trend,
      byEstate,
      rows,
    };
  }

  // ── RPT-02 — Revenue ─────────────────────────────────────────────
  // Processed settlements only — a pending settlement isn't realized revenue
  // yet.

  async revenueReport(period?: string): Promise<RevenueReport> {
    const processed = await this.settlementRepo.find({
      where: { status: 'processed' },
    });
    const byPeriod = groupBy(processed, (s) => labelToKey(s.period));
    const resolvedPeriod =
      period ?? latestKey(Object.keys(byPeriod)) ?? monthKeyOfDate(new Date());
    const periodRows = byPeriod[resolvedPeriod] ?? [];

    const grossOf = (s: SettlementEntity) =>
      Number(s.superKg) * Number(s.superRate) +
      Number(s.normalKg) * Number(s.normalRate);

    const totalRevenue = sumBy(periodRows, grossOf);
    const estates = new Set(periodRows.map((s) => s.estateName));
    const avgPerEstate = estates.size ? totalRevenue / estates.size : 0;

    const prevKey = prevMonthKey(resolvedPeriod);
    const prevRevenue = byPeriod[prevKey]
      ? sumBy(byPeriod[prevKey], grossOf)
      : null;
    const deltaPercent =
      prevRevenue !== null && prevRevenue > 0
        ? round1(((totalRevenue - prevRevenue) / prevRevenue) * 100)
        : null;

    const trend: TrendPoint[] = Object.keys(byPeriod)
      .sort()
      .map((key) => ({
        month: shortMonth(key),
        value: sumBy(byPeriod[key], grossOf),
      }));

    const byEstate = periodRows
      .map((s) => ({ estate: s.estateName, revenue: grossOf(s) }))
      .sort((a, b) => b.revenue - a.revenue);

    const rows = periodRows
      .map((s) => ({
        estate: s.estateName,
        superRs: Number(s.superKg) * Number(s.superRate),
        normalRs: Number(s.normalKg) * Number(s.normalRate),
        gross: grossOf(s),
      }))
      .sort((a, b) => b.gross - a.gross);

    return {
      period: resolvedPeriod,
      totalRevenue,
      avgPerEstate,
      prevRevenue,
      deltaPercent,
      trend,
      byEstate,
      rows,
    };
  }

  // ── RPT-03/04 — Expenses ─────────────────────────────────────────
  // Payroll + Fertilizer + Transport are DERIVED from payroll_runs/
  // settlements; only manual (Utilities/Maintenance/Miscellaneous/Other)
  // entries live in expense_entries.

  async expenseReport(period?: string): Promise<ExpenseReport> {
    const [payrollRuns, settlements, manual] = await Promise.all([
      this.payrollRepo.find(),
      this.settlementRepo.find(),
      this.expenseRepo.find(),
    ]);

    const payrollByPeriod = groupBy(payrollRuns, (p) => labelToKey(p.period));
    const settlementByPeriod = groupBy(settlements, (s) =>
      labelToKey(s.period),
    );
    const manualByPeriod = groupBy(manual, (e) => monthKeyOfDate(e.entryDate));

    const allKeys = new Set([
      ...Object.keys(payrollByPeriod),
      ...Object.keys(settlementByPeriod),
      ...Object.keys(manualByPeriod),
    ]);
    const resolvedPeriod =
      period ?? latestKey([...allKeys]) ?? monthKeyOfDate(new Date());

    const payrollSum = sumBy(payrollByPeriod[resolvedPeriod] ?? [], (p) =>
      Number(p.gross),
    );
    const transportSum = sumBy(
      settlementByPeriod[resolvedPeriod] ?? [],
      (s) => Number(s.transportCost),
    );
    const fertilizerSum = sumBy(
      settlementByPeriod[resolvedPeriod] ?? [],
      (s) => Number(s.fertilizerDeduction),
    );
    const manualRows = manualByPeriod[resolvedPeriod] ?? [];
    const manualByCategory = new Map<string, number>();
    for (const e of manualRows) {
      manualByCategory.set(
        e.category,
        (manualByCategory.get(e.category) ?? 0) + Number(e.amount),
      );
    }

    const split = [
      { category: 'Payroll', amount: payrollSum },
      { category: 'Fertilizer', amount: fertilizerSum },
      { category: 'Transport', amount: transportSum },
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
      sumBy(
        settlementByPeriod[key] ?? [],
        (s) => Number(s.transportCost) + Number(s.fertilizerDeduction),
      ) +
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
    if (fertilizerSum > 0) {
      rows.push({
        id: `SET-FERT-${resolvedPeriod}`,
        category: 'Fertilizer',
        description: `Fertilizer deductions offset — ${keyToLabel(resolvedPeriod)} settlements`,
        amount: fertilizerSum,
        date: `${resolvedPeriod}-14`,
        enteredBy: 'System',
        source: 'Settlement run',
      });
    }
    if (transportSum > 0) {
      rows.push({
        id: `SET-TRANS-${resolvedPeriod}`,
        category: 'Transport',
        description: `Route transport costs — ${keyToLabel(resolvedPeriod)} settlements`,
        amount: transportSum,
        date: `${resolvedPeriod}-14`,
        enteredBy: 'System',
        source: 'Settlement run',
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
    };
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
    return this.toPublicExpense(await this.expenseRepo.save(entry));
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
