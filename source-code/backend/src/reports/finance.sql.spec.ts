import { DataSource } from 'typeorm';
import { GradeRateEntity } from '../admin/grade-rate.entity';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import type { CollectionSettingsService } from '../collections/collection-settings.service';
import { DeliveryGradeLineEntity } from '../collections/delivery-grade-line.entity';
import { EmployeeAttendanceEntity } from '../employees/employee-attendance.entity';
import { EmployeeEntity } from '../employees/employee.entity';
import { PayrollRunEntity } from '../employees/payroll-run.entity';
import { SalaryAdvanceEntity } from '../employees/salary-advance.entity';
import { EstateAdvanceRecoveryEntity } from '../estates/estate-advance-recovery.entity';
import { EstateAdvanceEntity } from '../estates/estate-advance.entity';
import { EstateEntity } from '../estates/estate.entity';
import { SettlementEntity } from '../estates/settlement.entity';
import { FertilizerBatchEntity } from '../fertilizer/fertilizer-batch.entity';
import { StockMovementEntity } from '../fertilizer/stock-movement.entity';
import { CollectionReportService } from './collection-report.service';
import { ExpenseEntryEntity } from './expense-entry.entity';
import { FinanceService } from './finance.service';
import { LeafPurchaseService } from './leaf-purchase.service';

/*
  RPT-03 against a real database: each expense category for a month equals a direct SQL query
  (Finance-Reports-Addendum §8), and the leaf line equals the Leaf Purchase report. Opt-in, read-only:

    REPORT_SQL_CHECK_URL=postgresql://tea@localhost:5433/tea_dev npx jest finance.sql
*/
const URL = process.env.REPORT_SQL_CHECK_URL;
const MONTH = process.env.REPORT_SQL_CHECK_MONTH ?? '2026-10';

const SQL = {
  leaf: `
    WITH lines AS (
      SELECT delivery_id,
             coalesce(sum(weight_kg) FILTER (WHERE grade = 'super'), 0)  AS s,
             coalesce(sum(weight_kg) FILTER (WHERE grade = 'normal'), 0) AS n
        FROM delivery_grade_lines GROUP BY delivery_id
    ), graded AS (
      SELECT l.s, l.n,
             (SELECT g.id FROM grade_rates g WHERE g.effective_date <= r.collection_date
               ORDER BY g.effective_date DESC LIMIT 1) AS rate_id
        FROM tea_collection_records r JOIN lines l ON l.delivery_id = r.id
       WHERE r.status IN ('collected', 'confirmed') AND r.provisional IS NULL
         AND to_char(r.collection_date, 'YYYY-MM') = $1
    )
    SELECT coalesce(sum(round(d.s * g.super_rate, 2) + round(d.n * g.normal_rate, 2)), 0) AS v
      FROM graded d JOIN grade_rates g ON g.id = d.rate_id`,
  // payroll_runs.period is a 'Month YYYY' label
  wages: `SELECT coalesce(sum(gross), 0) AS v FROM payroll_runs
           WHERE status = 'Processed' AND to_char(to_date(period, 'FMMonth YYYY'), 'YYYY-MM') = $1`,
  estimate: `
    SELECT coalesce(sum(a.day_hours * e.day_rate + a.day_ot_hours * e.day_ot_rate
                      + a.night_hours * e.night_rate + a.night_ot_hours * e.night_ot_rate), 0) AS v
      FROM employee_attendance a JOIN employees e ON e.id = a.employee_id
     WHERE to_char(a.date, 'YYYY-MM') = $1
       AND NOT EXISTS (SELECT 1 FROM payroll_runs p
                        WHERE p.employee_id = a.employee_id AND p.status = 'Processed'
                          AND to_char(to_date(p.period, 'FMMonth YYYY'), 'YYYY-MM') = $1)`,
  stock: `SELECT coalesce(sum(round(quantity_kg * unit_cost, 2)), 0) AS v FROM stock_movements
           WHERE type = 'Incoming' AND unit_cost IS NOT NULL AND to_char(movement_date, 'YYYY-MM') = $1`,
  manual: `SELECT coalesce(sum(amount), 0) AS v FROM expense_entries
            WHERE to_char(entry_date, 'YYYY-MM') = $1`,
  recovered: `
    SELECT coalesce(sum(transport_cost + fertilizer_deduction + advance_deduction), 0) AS v
      FROM settlements
     WHERE status = 'processed' AND to_char(to_date(period, 'FMMonth YYYY'), 'YYYY-MM') = $1`,
};

export const FINANCE_ENTITIES = [
  CollectionRecordEntity,
  DeliveryGradeLineEntity,
  EstateEntity,
  GradeRateEntity,
  SettlementEntity,
  PayrollRunEntity,
  EmployeeEntity,
  EmployeeAttendanceEntity,
  SalaryAdvanceEntity,
  EstateAdvanceEntity,
  EstateAdvanceRecoveryEntity,
  StockMovementEntity,
  FertilizerBatchEntity,
  ExpenseEntryEntity,
];

(URL ? describe : describe.skip)(`RPT-03 vs direct SQL (${MONTH})`, () => {
  let ds: DataSource;

  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      url: URL,
      entities: FINANCE_ENTITIES,
    });
    await ds.initialize();
  });
  afterAll(() => ds?.destroy());

  it('each category equals its SQL, and leaf equals the Leaf Purchase report', async () => {
    const collection = new CollectionReportService(
      ds.getRepository(CollectionRecordEntity),
      ds.getRepository(EstateEntity),
      {
        get: () => Promise.resolve({ mismatchTolerancePct: 5 }),
      } as unknown as CollectionSettingsService,
    );
    const r = <T extends object>(e: new () => T) => ds.getRepository(e);
    const finance = new FinanceService(
      collection,
      r(GradeRateEntity),
      r(SettlementEntity),
      r(PayrollRunEntity),
      r(EmployeeAttendanceEntity),
      r(EmployeeEntity),
      r(StockMovementEntity),
      r(FertilizerBatchEntity),
      r(ExpenseEntryEntity),
      r(EstateAdvanceEntity),
      r(EstateAdvanceRecoveryEntity),
      r(SalaryAdvanceEntity),
    );
    const leafReport = new LeafPurchaseService(
      collection,
      finance,
      r(EstateEntity),
    );

    const sql: Record<string, number> = {};
    for (const [k, q] of Object.entries(SQL)) {
      const [row] = await ds.query<{ v: string }[]>(q, [MONTH]);
      sql[k] = Number(row.v);
    }
    const page = await finance.expenseReport({ month: MONTH });
    const leaf = await leafReport.report({ month: MONTH });
    const cat = (kind: string) =>
      page.byCategory
        .filter((c) => c.kind === kind)
        .reduce((s, c) => s + c.amount, 0);

    console.log(
      `${MONTH}            SQL          page\n` +
        `leaf purchases  ${sql.leaf}   ${cat('leaf')}   (Leaf Purchase report: ${leaf.cards.leafValue.value})\n` +
        `wages processed ${sql.wages}   ${cat('wages')}\n` +
        `wages estimated ${sql.estimate}   ${page.wagesEstimate.amountRs}   (not in total)\n` +
        `stock purchases ${sql.stock}   ${cat('stock')}\n` +
        `manual entries  ${sql.manual}   ${cat('operating')}\n` +
        `recovered       ${sql.recovered}   ${page.cards.recovered.totalRs}   (not in total)\n` +
        `TOTAL           ${sql.leaf + sql.wages + sql.stock + sql.manual}   ${page.cards.total.value}`,
    );
    expect(cat('leaf')).toBeCloseTo(sql.leaf, 2);
    expect(cat('leaf')).toBeCloseTo(leaf.cards.leafValue.value, 2);
    expect(cat('wages')).toBeCloseTo(sql.wages, 2);
    expect(page.wagesEstimate.amountRs).toBeCloseTo(sql.estimate, 2);
    expect(cat('stock')).toBeCloseTo(sql.stock, 2);
    expect(cat('operating')).toBeCloseTo(sql.manual, 2);
    expect(page.cards.recovered.totalRs).toBeCloseTo(sql.recovered, 2);
    expect(page.cards.total.value).toBeCloseTo(
      sql.leaf + sql.wages + sql.stock + sql.manual,
      2,
    );
    // deductions are never an expense category
    expect(page.byCategory.map((c) => c.category)).not.toEqual(
      expect.arrayContaining(['Transport', 'Fertilizer']),
    );
  });
});
