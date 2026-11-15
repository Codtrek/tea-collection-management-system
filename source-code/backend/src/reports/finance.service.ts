import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Repository } from 'typeorm';
import { GradeRateEntity } from '../admin/grade-rate.entity';
import { localDate } from '../dispatch/dispatch-map';
import { EmployeeAttendanceEntity } from '../employees/employee-attendance.entity';
import { EmployeeEntity } from '../employees/employee.entity';
import { PayrollRunEntity } from '../employees/payroll-run.entity';
import { SalaryAdvanceEntity } from '../employees/salary-advance.entity';
import { EstateAdvanceRecoveryEntity } from '../estates/estate-advance-recovery.entity';
import { EstateAdvanceEntity } from '../estates/estate-advance.entity';
import { SettlementEntity } from '../estates/settlement.entity';
import { FertilizerBatchEntity } from '../fertilizer/fertilizer-batch.entity';
import { StockMovementEntity } from '../fertilizer/stock-movement.entity';
import {
  resolvePeriod,
  toFact,
  type DateRange,
  type PeriodInput,
} from './collection-report-rules';
import { CollectionReportService } from './collection-report.service';
import { ExpenseCategoryEntity } from './expense-category.entity';
import { ExpenseEntryEntity } from './expense-entry.entity';
import {
  buildExpenseReport,
  EXPENSE_GROUPS,
  type ExpenseGroupBy,
  type ExpenseReport,
  type FinanceInputs,
  type StockInInput,
  type StockLostLine,
} from './finance-rules';
import {
  leafTrendRange,
  leafValueByMonth,
  valueDeliveries,
  type RateVersion,
  type SettlementInput,
} from './leaf-purchase-rules';
import { labelToKey } from './reports-map';

export interface ExpenseReportQuery extends PeriodInput {
  groupBy?: ExpenseGroupBy;
  category?: string;
}

const lo = (...ds: string[]) => ds.reduce((a, b) => (b < a ? b : a));
const hi = (...ds: string[]) => ds.reduce((a, b) => (b > a ? b : a));

/**
 * The ONE place report money figures are loaded (Finance-Reports-Addendum): leaf value at the
 * grade rates in force, settlements and their deductions, payroll, attendance, stock purchases,
 * daily expense entries and advances. The Leaf Purchase report (RPT-02) and the Expense report
 * (RPT-03) both read through here, and `finance-rules.ts` decides what each figure IS.
 */
@Injectable()
export class FinanceService {
  constructor(
    private readonly collection: CollectionReportService,
    @InjectRepository(GradeRateEntity)
    private readonly rates: Repository<GradeRateEntity>,
    @InjectRepository(SettlementEntity)
    private readonly settlements: Repository<SettlementEntity>,
    @InjectRepository(PayrollRunEntity)
    private readonly payroll: Repository<PayrollRunEntity>,
    @InjectRepository(EmployeeAttendanceEntity)
    private readonly attendance: Repository<EmployeeAttendanceEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly employees: Repository<EmployeeEntity>,
    @InjectRepository(StockMovementEntity)
    private readonly movements: Repository<StockMovementEntity>,
    @InjectRepository(FertilizerBatchEntity)
    private readonly batches: Repository<FertilizerBatchEntity>,
    @InjectRepository(ExpenseEntryEntity)
    private readonly expenses: Repository<ExpenseEntryEntity>,
    @InjectRepository(ExpenseCategoryEntity)
    private readonly expenseCategories: Repository<ExpenseCategoryEntity>,
    @InjectRepository(EstateAdvanceEntity)
    private readonly estateAdvances: Repository<EstateAdvanceEntity>,
    @InjectRepository(EstateAdvanceRecoveryEntity)
    private readonly estateRecoveries: Repository<EstateAdvanceRecoveryEntity>,
    @InjectRepository(SalaryAdvanceEntity)
    private readonly salaryAdvances: Repository<SalaryAdvanceEntity>,
  ) {}

  /* ── Leaf (shared with RPT-02) ── */

  async rateVersions(): Promise<RateVersion[]> {
    // a cancelled scheduled version never applies (Administration-Addendum §3)
    return (await this.rates.find({ where: { cancelledAt: IsNull() } })).map(
      (r) => ({
        effectiveDate: r.effectiveDate,
        superRate: Number(r.superRate),
        normalRate: Number(r.normalRate),
      }),
    );
  }

  async settlementRows(): Promise<SettlementInput[]> {
    return (await this.settlements.find()).map((s) => ({
      id: s.id,
      month: labelToKey(s.period),
      status: s.status,
      superKg: Number(s.superKg),
      normalKg: Number(s.normalKg),
      superRate: Number(s.superRate),
      normalRate: Number(s.normalRate),
      transportCost: Number(s.transportCost),
      fertilizerDeduction: Number(s.fertilizerDeduction),
      advanceDeduction: Number(s.advanceDeduction),
      adjustmentAmount: Number(s.adjustmentAmount ?? 0),
    }));
  }

  /** Every graded delivery in a range with its value at the rate in force (no filters, demo included). */
  async leafValues(
    range: DateRange,
  ): Promise<{ date: string; valueRs: number | null }[]> {
    const [rows, rates] = await Promise.all([
      this.collection.load(range),
      this.rateVersions(),
    ]);
    return valueDeliveries(
      rows.map((r) => toFact(r)),
      rates,
      new Set(),
    ).map((d) => ({ date: d.date, valueRs: d.valueRs }));
  }

  /** Accrued leaf value per month over a range. */
  async leafValueByMonth(range: DateRange): Promise<Map<string, number>> {
    const [rows, rates] = await Promise.all([
      this.collection.load(range),
      this.rateVersions(),
    ]);
    return leafValueByMonth(
      rows.map((r) => toFact(r)),
      rates,
    );
  }

  /* ── RPT-03 ── */

  async expenseReport(
    q: ExpenseReportQuery,
    now: Date = new Date(),
  ): Promise<ExpenseReport> {
    const today = localDate(now);
    const period = resolvePeriod(q, today);
    const trendRange = leafTrendRange(period);
    // one load covering the period, its comparisons and the trend
    const span: DateRange = {
      from: lo(
        period.from,
        period.previous.from,
        period.lastYear.from,
        trendRange.from,
      ),
      to: hi(period.to, trendRange.to),
    };
    const [inputs, stockLost, categories, deliveryMonths, entryMonths] =
      await Promise.all([
        this.inputs(span),
        this.stockLost(period),
        this.expenseCategories.find({
          order: { sortOrder: 'ASC', name: 'ASC' },
        }),
        this.collection.monthsWithData(),
        this.expenses.manager.query<{ month: string }[]>(
          `SELECT DISTINCT to_char(entry_date, 'YYYY-MM') AS month FROM expense_entries`,
        ),
      ]);
    return buildExpenseReport({
      today,
      period,
      trendRange,
      groupBy:
        q.groupBy && EXPENSE_GROUPS.includes(q.groupBy)
          ? q.groupBy
          : 'category',
      category: q.category,
      inputs,
      stockLost,
      // the filter offers the categories in use, and any that appear on old entries
      categories: categories.filter((c) => c.active).map((c) => c.name),
      monthsWithData: [
        ...new Set([...deliveryMonths, ...entryMonths.map((r) => r.month)]),
      ].sort((a, b) => b.localeCompare(a)),
    });
  }

  /** What finance-rules needs for a span. The small tables are read whole; dates are filtered there. */
  async inputs(span: DateRange): Promise<FinanceInputs> {
    const [
      leaf,
      payroll,
      attendance,
      employees,
      movements,
      batches,
      manual,
      settlements,
      recoveries,
      estateAdvances,
      salaryAdvances,
      expenseCategories,
    ] = await Promise.all([
      this.leafValues(span),
      this.payroll.find(),
      this.attendance.find({ where: { date: Between(span.from, span.to) } }),
      this.employees.find(),
      this.movements.find({ where: { type: 'Incoming' } }),
      this.batches.find(),
      this.expenses.find(),
      this.settlementRows(),
      this.estateRecoveries.find(),
      this.estateAdvances.find(),
      this.salaryAdvances.find({ where: { status: 'Approved' } }),
      this.expenseCategories.find(),
    ]);
    const categoryName = new Map(expenseCategories.map((c) => [c.id, c.name]));
    const item = new Map(batches.map((b) => [b.id, b.item]));
    const withIncoming = new Set(movements.map((m) => m.batchId));
    const stockIns: StockInInput[] = [
      ...movements.map((m) => ({
        id: m.id,
        batchId: m.batchId,
        item: item.get(m.batchId) ?? 'Unknown item',
        date: m.movementDate,
        quantityKg: Number(m.quantityKg),
        unitCost: m.unitCost === null ? null : Number(m.unitCost),
        supplier: m.supplier,
      })),
      // a batch registered without an Incoming movement is still stock that came in — with no
      // cost on record (negative ids keep them apart from movement ids)
      ...batches
        .filter((b) => !withIncoming.has(b.id) && !b.discarded)
        .map((b) => ({
          id: -b.id,
          batchId: b.id,
          item: b.item,
          date: b.receivedDate,
          quantityKg: Number(b.quantityKg),
          unitCost: null,
          supplier: b.supplier,
        })),
    ];
    return {
      leaf,
      payroll: payroll.map((p) => ({
        employeeId: p.employeeId,
        month: labelToKey(p.period),
        gross: Number(p.gross),
        status: p.status,
      })),
      attendance: attendance.map((a) => ({
        employeeId: a.employeeId,
        date: a.date,
        dayHours: Number(a.dayHours),
        dayOtHours: Number(a.dayOtHours),
        nightHours: Number(a.nightHours),
        nightOtHours: Number(a.nightOtHours),
      })),
      employees: employees.map((e) => ({
        id: e.id,
        dayRate: Number(e.dayRate),
        dayOtRate: Number(e.dayOtRate),
        nightRate: Number(e.nightRate),
        nightOtRate: Number(e.nightOtRate),
      })),
      stockIns,
      manual: manual.map((e) => ({
        id: e.id,
        date: e.entryDate,
        category: categoryName.get(e.categoryId) ?? 'Uncategorised',
        description: e.description,
        amount: Number(e.amount),
        paidVia: e.paidVia,
        enteredBy: e.enteredBy,
      })),
      settlements,
      directRecoveries: recoveries.map((r) => ({
        kind: r.kind,
        status: r.status,
        paidOn: r.paidOn,
        amount: Number(r.amount),
      })),
      loans: [
        ...estateAdvances.map((a) => ({
          kind: 'estate' as const,
          id: a.id,
          name: a.estateName,
          date: a.dateIssued,
          amount: Number(a.amount),
        })),
        ...salaryAdvances
          .filter((a) => a.decidedOn)
          .map((a) => ({
            kind: 'salary' as const,
            id: a.id,
            name: a.employeeName,
            date: localDate(new Date(a.decidedOn!)),
            amount: Number(a.amount),
          })),
      ],
    };
  }

  /** Fertilizer written off in the period, per item and reason (kg). Never an expense. */
  private async stockLost(period: DateRange): Promise<StockLostLine[]> {
    const [writeOffs, batches] = await Promise.all([
      this.movements.find({
        where: {
          type: 'Write-off',
          movementDate: Between(period.from, period.to),
        },
      }),
      this.batches.find(),
    ]);
    const itemOf = new Map(batches.map((b) => [b.id, b.item]));
    const byKey = new Map<string, StockLostLine>();
    for (const m of writeOffs) {
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
}
