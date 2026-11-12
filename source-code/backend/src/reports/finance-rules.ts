/*
  Finance rules — expense vs recovery vs loan, defined ONCE for every report page
  (docs/specs/Finance-Reports-Addendum.md). Pure functions: every number on the Expense report
  (RPT-03), its table, totals and CSV export comes from here, and FinanceService feeds the Leaf
  Purchase report (RPT-02) from the same loaders, so the two pages can't disagree.

  EXPENSE (money the factory spends; counted in the total):
    • Green leaf purchases — graded deliveries × the grade rate in force on the delivery date
      (valueDeliveries), accrued by delivery date
    • Wages — PROCESSED payroll, by pay month (gross)
    • Fertilizer stock purchases — Incoming stock × the unit cost recorded on it, by movement date
    • Operating costs — daily expense entries, by expense date, under their category
  NOT AN EXPENSE:
    • Recovered from estate owners — transport and fertilizer charges and advance installments
      deducted on processed settlements (plus advance repayments in cash / bank): money coming
      back, shown in its own panel
    • Loans — estate owner and salary advances issued: cash out, expected back
    • Estimated wages — attendance × rates for employee-months with no processed payroll:
      shown beside the total, never in it
    • Stock lost — fertilizer written off: its cost was counted when it was bought
*/
import { grossFromHours, sumHours } from '../employees/payroll-gross';
import type { HourRates, HourTotals } from '../employees/payroll-gross';
import {
  changePct,
  inRange,
  monthLabel,
  monthOf,
  monthRange,
  trendBuckets,
  type DateRange,
  type ResolvedPeriod,
} from './collection-report-rules';
import { settledPayments, type SettlementInput } from './leaf-purchase-rules';

const r2 = (n: number) => Math.round(n * 100) / 100;
const r1 = (n: number) => Math.round(n * 10) / 10;
const pctOf = (part: number, whole: number) =>
  whole > 0 ? r1((part / whole) * 100) : null;

export type ExpenseKind = 'leaf' | 'wages' | 'stock' | 'operating';
export type ExpenseSource = 'Leaf' | 'Payroll' | 'Stock' | 'Manual';
export type ExpenseGroupBy = 'category' | 'month' | 'entry';
export const EXPENSE_GROUPS: ExpenseGroupBy[] = ['category', 'month', 'entry'];

/** The category name a non-manual line goes under (manual lines use their own category). */
export const KIND_CATEGORY: Record<
  Exclude<ExpenseKind, 'operating'>,
  string
> = {
  leaf: 'Green leaf purchases',
  wages: 'Wages',
  stock: 'Fertilizer stock purchases',
};

const KIND_SOURCE: Record<ExpenseKind, ExpenseSource> = {
  leaf: 'Leaf',
  wages: 'Payroll',
  stock: 'Stock',
  operating: 'Manual',
};

/* ── Inputs (FinanceService maps the entities onto these) ── */

/** A graded delivery and its value at the rate in force (null: no rate version that day). */
export interface LeafValueInput {
  date: string;
  valueRs: number | null;
}

export interface PayrollInput {
  employeeId: number;
  /** pay month, 'YYYY-MM' */
  month: string;
  gross: number;
  status: 'Pending' | 'Processed';
}

export interface AttendanceHoursInput extends HourTotals {
  employeeId: number;
  date: string;
}

export interface EmployeeRatesInput extends HourRates {
  id: number;
}

export interface StockInInput {
  id: number;
  batchId: number;
  item: string;
  date: string;
  quantityKg: number;
  /** Rs per kg as recorded on the stock-in; null for stock received before costs were recorded */
  unitCost: number | null;
  supplier: string | null;
}

export interface ManualExpenseInput {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paidVia: 'cash' | 'bank' | null;
  enteredBy: string;
}

/** An estate advance repayment outside a settlement (cash / bank). */
export interface DirectRecoveryInput {
  kind: 'settlement' | 'cash' | 'bank';
  status: 'reserved' | 'recovered';
  paidOn: string | null;
  amount: number;
}

export interface LoanInput {
  kind: 'estate' | 'salary';
  id: string;
  name: string;
  date: string;
  amount: number;
}

export interface StockLostLine {
  item: string;
  reason: string;
  kg: number;
}

export interface FinanceInputs {
  leaf: LeafValueInput[];
  payroll: PayrollInput[];
  attendance: AttendanceHoursInput[];
  employees: EmployeeRatesInput[];
  stockIns: StockInInput[];
  manual: ManualExpenseInput[];
  settlements: SettlementInput[];
  directRecoveries: DirectRecoveryInput[];
  loans: LoanInput[];
}

/* ── Expense lines ── */

export interface ExpenseLine {
  id: string;
  date: string;
  kind: ExpenseKind;
  category: string;
  description: string;
  amount: number;
  /** underlying records: deliveries / payroll rows / stock-ins / entries */
  records: number;
  source: ExpenseSource;
  /** where the record lives in the portal */
  href: string;
  enteredBy: string | null;
  paidVia: 'cash' | 'bank' | null;
}

/** The months a range touches, 'YYYY-MM' (pay months and settlement months count by month). */
const monthsOf = (r: DateRange) => ({
  from: monthOf(r.from),
  to: monthOf(r.to),
});
const monthIn = (m: string, r: DateRange) => {
  const ms = monthsOf(r);
  return m >= ms.from && m <= ms.to;
};

/** The part of `month` inside `r`, as a Leaf Purchase Report link. */
function leafHref(month: string, r: DateRange): string {
  const whole = monthRange(month);
  const from = whole.from < r.from ? r.from : whole.from;
  const to = whole.to > r.to ? r.to : whole.to;
  return from === whole.from && to === whole.to
    ? `/reports/leaf-purchases?month=${month}`
    : `/reports/leaf-purchases?from=${from}&to=${to}`;
}

/** Every expense line in a range — the one place that decides what counts. */
export function expenseLines(i: FinanceInputs, r: DateRange): ExpenseLine[] {
  const lines: ExpenseLine[] = [];

  // Leaf: one line per month, accrued by delivery date (a delivery without a rate adds nothing)
  const leafByMonth = new Map<
    string,
    { rs: number; n: number; last: string }
  >();
  for (const d of i.leaf) {
    if (d.valueRs === null || !inRange(d.date, r)) continue;
    const m = monthOf(d.date);
    const acc = leafByMonth.get(m) ?? { rs: 0, n: 0, last: d.date };
    acc.rs += d.valueRs;
    acc.n += 1;
    if (d.date > acc.last) acc.last = d.date;
    leafByMonth.set(m, acc);
  }
  for (const [m, acc] of leafByMonth) {
    lines.push({
      id: `LEAF-${m}`,
      date: acc.last,
      kind: 'leaf',
      category: KIND_CATEGORY.leaf,
      description: `Green leaf, ${monthLabel(m)}: ${acc.n} graded deliver${acc.n === 1 ? 'y' : 'ies'} at the grade rates in force`,
      amount: r2(acc.rs),
      records: acc.n,
      source: 'Leaf',
      href: leafHref(m, r),
      enteredBy: null,
      paidVia: null,
    });
  }

  // Wages: processed payroll, one line per pay month
  const payByMonth = new Map<string, { rs: number; n: number }>();
  for (const p of i.payroll) {
    if (p.status !== 'Processed' || !monthIn(p.month, r)) continue;
    const acc = payByMonth.get(p.month) ?? { rs: 0, n: 0 };
    acc.rs += p.gross;
    acc.n += 1;
    payByMonth.set(p.month, acc);
  }
  for (const [m, acc] of payByMonth) {
    const end = monthRange(m).to;
    lines.push({
      id: `PAY-${m}`,
      date: end > r.to ? r.to : end,
      kind: 'wages',
      category: KIND_CATEGORY.wages,
      description: `${monthLabel(m)} payroll (processed): ${acc.n} employee${acc.n === 1 ? '' : 's'}, gross`,
      amount: r2(acc.rs),
      records: acc.n,
      source: 'Payroll',
      href: `/employees/payroll?month=${m}`,
      enteredBy: null,
      paidVia: null,
    });
  }

  // Fertilizer stock: each costed stock-in, by movement date
  for (const s of i.stockIns) {
    if (s.unitCost === null || !inRange(s.date, r)) continue;
    lines.push({
      id: `STK-${s.id}`,
      date: s.date,
      kind: 'stock',
      category: KIND_CATEGORY.stock,
      description: `${s.item}: ${s.quantityKg} kg × Rs ${s.unitCost}${s.supplier ? ` (${s.supplier})` : ''}`,
      amount: r2(s.quantityKg * s.unitCost),
      records: 1,
      source: 'Stock',
      href: `/fertilizer/${s.batchId}`,
      enteredBy: null,
      paidVia: null,
    });
  }

  // Operating costs: daily expense entries, by expense date
  for (const e of i.manual) {
    if (!inRange(e.date, r)) continue;
    lines.push({
      id: e.id,
      date: e.date,
      kind: 'operating',
      category: e.category,
      description: e.description,
      amount: r2(e.amount),
      records: 1,
      source: 'Manual',
      href: `/reports/expenses/${e.id}`,
      enteredBy: e.enteredBy,
      paidVia: e.paidVia,
    });
  }

  return lines.sort(
    (a, b) =>
      (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) ||
      a.id.localeCompare(b.id),
  );
}

const total = (lines: ExpenseLine[]) =>
  r2(lines.reduce((s, l) => s + l.amount, 0));

/* ── Not expenses ── */

export interface WageEstimate {
  amountRs: number;
  /** employee-months estimated, per pay month */
  months: {
    month: string;
    amountRs: number;
    employees: number;
    days: number;
  }[];
}

/**
 * Wages for employee-months with no PROCESSED payroll row, from attendance × the employee's
 * current rates (the payroll formula, grossFromHours). Never part of the expense total.
 */
export function estimateWages(i: FinanceInputs, r: DateRange): WageEstimate {
  const processed = new Set(
    i.payroll
      .filter((p) => p.status === 'Processed')
      .map((p) => `${p.employeeId}|${p.month}`),
  );
  const rates = new Map(i.employees.map((e) => [e.id, e]));
  const groups = new Map<string, AttendanceHoursInput[]>();
  for (const a of i.attendance) {
    if (!inRange(a.date, r)) continue;
    const key = `${a.employeeId}|${monthOf(a.date)}`;
    if (processed.has(key) || !rates.has(a.employeeId)) continue;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(a);
  }
  const byMonth = new Map<
    string,
    { rs: number; employees: number; days: number }
  >();
  for (const [key, rows] of groups) {
    const [employeeId, month] = key.split('|');
    const rs = grossFromHours(sumHours(rows), rates.get(Number(employeeId))!);
    const acc = byMonth.get(month) ?? { rs: 0, employees: 0, days: 0 };
    acc.rs += rs;
    acc.employees += 1;
    acc.days += rows.length;
    byMonth.set(month, acc);
  }
  const months = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, a]) => ({
      month,
      amountRs: r2(a.rs),
      employees: a.employees,
      days: a.days,
    }))
    .filter((m) => m.amountRs > 0);
  return { amountRs: r2(months.reduce((s, m) => s + m.amountRs, 0)), months };
}

export interface Recoveries {
  /** processed settlements in the range's months */
  settlements: number;
  transportRs: number;
  fertilizerRs: number;
  /** advance installments: deducted on settlements + repaid in cash / bank */
  advancesRs: number;
  totalRs: number;
}

/** Money estate owners pay back — deductions on processed settlements, by settlement month. */
export function recoveries(i: FinanceInputs, r: DateRange): Recoveries {
  const s = settledPayments(i.settlements, r, new Set());
  // settlement-kind recoveries ARE the settlements' advance deductions — counted once, there
  const direct = r2(
    i.directRecoveries
      .filter(
        (x) =>
          x.kind !== 'settlement' &&
          x.status === 'recovered' &&
          x.paidOn !== null &&
          inRange(x.paidOn, r),
      )
      .reduce((acc, x) => acc + x.amount, 0),
  );
  const advancesRs = r2(s.advancesRs + direct);
  return {
    settlements: s.count,
    transportRs: s.transportRs,
    fertilizerRs: s.fertilizerRs,
    advancesRs,
    totalRs: r2(s.transportRs + s.fertilizerRs + advancesRs),
  };
}

export interface LoansIssued {
  totalRs: number;
  estateRs: number;
  salaryRs: number;
  count: number;
}

export function loansIssued(i: FinanceInputs, r: DateRange): LoansIssued {
  const list = i.loans.filter((l) => inRange(l.date, r));
  const sum = (k?: LoanInput['kind']) =>
    r2(
      list.filter((l) => !k || l.kind === k).reduce((s, l) => s + l.amount, 0),
    );
  return {
    totalRs: sum(),
    estateRs: sum('estate'),
    salaryRs: sum('salary'),
    count: list.length,
  };
}

/* ── The report ── */

export interface ExpenseTableRow {
  key: string;
  name: string;
  /** entry rows only */
  date: string | null;
  category: string | null;
  kind: ExpenseKind | null;
  description: string | null;
  source: ExpenseSource | null;
  href: string | null;
  enteredBy: string | null;
  paidVia: 'cash' | 'bank' | null;
  records: number;
  amount: number;
  /** share of the period total, % */
  pct: number | null;
}

export interface ExpenseTrendPoint {
  key: string;
  label: string;
  leaf: number;
  wages: number;
  stock: number;
  operating: number;
  total: number;
  partial: boolean;
}

export interface ExpenseReport {
  period: Omit<ResolvedPeriod, 'previous' | 'lastYear'>;
  filters: { category: string | null };
  cards: {
    total: {
      value: number;
      previous: number | null;
      changePct: number | null;
      lastYear: number | null;
      yoyPct: number | null;
    };
    largest: { category: string; amount: number; pct: number } | null;
    leafShare: { amount: number; pct: number | null };
    recovered: Recoveries;
  };
  byCategory: {
    category: string;
    kind: ExpenseKind;
    amount: number;
    pct: number | null;
  }[];
  trend: ExpenseTrendPoint[];
  table: {
    groupBy: ExpenseGroupBy;
    rows: ExpenseTableRow[];
    totals: { records: number; amount: number };
  };
  /** leaf purchases − transport charges recovered */
  netLeafCostRs: number;
  wagesEstimate: WageEstimate;
  loans: LoansIssued;
  stock: { uncosted: number; uncostedKg: number };
  stockLost: StockLostLine[];
  /** why the period shows nothing (null when it has expenses), plus what IS there */
  empty: { reason: string | null; hints: string[] };
  options: { categories: string[] };
}

function groupRows(
  lines: ExpenseLine[],
  by: ExpenseGroupBy,
  periodTotal: number,
): ExpenseTableRow[] {
  const base = {
    date: null,
    description: null,
    enteredBy: null,
    paidVia: null,
  } as const;
  if (by === 'entry') {
    return lines.map((l) => ({
      key: l.id,
      name: l.id,
      date: l.date,
      category: l.category,
      kind: l.kind,
      description: l.description,
      source: l.source,
      href: l.href,
      enteredBy: l.enteredBy,
      paidVia: l.paidVia,
      records: l.records,
      amount: l.amount,
      pct: pctOf(l.amount, periodTotal),
    }));
  }
  const groups = new Map<string, ExpenseLine[]>();
  for (const l of lines) {
    const key = by === 'category' ? l.category : monthOf(l.date);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(l);
  }
  const rows = [...groups.entries()].map(([key, ls]): ExpenseTableRow => {
    const amount = total(ls);
    const kind = ls[0].kind;
    const one = ls.length === 1 ? ls[0] : null;
    return {
      ...base,
      key,
      name: by === 'category' ? key : monthLabel(key),
      category: by === 'category' ? key : null,
      kind: by === 'category' ? kind : null,
      source: by === 'category' ? KIND_SOURCE[kind] : null,
      // a group of one record links straight to it
      href: by === 'category' && one && kind !== 'operating' ? one.href : null,
      records: ls.reduce((s, l) => s + l.records, 0),
      amount,
      pct: pctOf(amount, periodTotal),
    };
  });
  return by === 'month'
    ? rows.sort((a, b) => b.key.localeCompare(a.key))
    : rows.sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

function emptyReason(
  i: FinanceInputs,
  r: DateRange,
  label: string,
  category: string | null,
): string {
  if (category) return `No ${category} expenses in ${label}.`;
  const graded = i.leaf.filter((d) => inRange(d.date, r));
  const parts = [
    'no processed payroll',
    graded.length
      ? `${graded.length} graded deliver${graded.length === 1 ? 'y has' : 'ies have'} no grade rate in force`
      : 'no deliveries graded',
    'no fertilizer stock bought with a recorded cost',
    'no manual entries',
  ];
  const sentence = `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)} in ${label}.`;
  return sentence[0].toUpperCase() + sentence.slice(1);
}

export interface BuildExpenseInput {
  today: string;
  period: ResolvedPeriod;
  /** the months the trend covers (leafTrendRange of the period) */
  trendRange: DateRange;
  groupBy: ExpenseGroupBy;
  category?: string | null;
  inputs: FinanceInputs;
  stockLost: StockLostLine[];
  /** the active expense categories, for the filter */
  categories: string[];
}

export function buildExpenseReport(b: BuildExpenseInput): ExpenseReport {
  const { period: p, inputs: i } = b;
  const category = b.category?.trim() || null;
  const pick = (r: DateRange) =>
    expenseLines(i, r).filter((l) => !category || l.category === category);

  const lines = pick(p);
  const value = total(lines);
  const previousLines = pick(p.previous);
  const lastYearLines = pick(p.lastYear);
  const previous = previousLines.length ? total(previousLines) : null;
  const lastYear = lastYearLines.length ? total(lastYearLines) : null;

  const byCategory = groupRows(lines, 'category', value).map((g) => ({
    category: g.name,
    kind: g.kind!,
    amount: g.amount,
    pct: g.pct,
  }));
  const largest = byCategory[0]
    ? {
        category: byCategory[0].category,
        amount: byCategory[0].amount,
        pct: byCategory[0].pct ?? 0,
      }
    : null;
  const leafRs = total(lines.filter((l) => l.kind === 'leaf'));
  const rec = recoveries(i, p);

  const trendLines = pick(b.trendRange);
  const trend = trendBuckets(b.trendRange, 'month').map(({ key, label }) => {
    const ms = trendLines.filter((l) => monthOf(l.date) === key);
    const of = (k: ExpenseKind) => total(ms.filter((l) => l.kind === k));
    return {
      key,
      label,
      leaf: of('leaf'),
      wages: of('wages'),
      stock: of('stock'),
      operating: of('operating'),
      total: total(ms),
      partial: monthRange(key).to >= b.today,
    };
  });

  const wagesEstimate = estimateWages(i, p);
  const uncosted = i.stockIns.filter(
    (s) => s.unitCost === null && inRange(s.date, p),
  );
  const hints: string[] = [];
  if (wagesEstimate.amountRs > 0) {
    hints.push(
      `Attendance × pay rates comes to about Rs ${wagesEstimate.amountRs.toLocaleString('en-LK', { maximumFractionDigits: 0 })} in wages whose payroll isn't processed yet (${wagesEstimate.months.map((m) => monthLabel(m.month)).join(', ')}). Not counted until payroll is processed.`,
    );
  }
  if (uncosted.length) {
    hints.push(
      `${uncosted.length} fertilizer stock-in${uncosted.length === 1 ? ' has' : 's have'} no cost recorded, so ${uncosted.length === 1 ? 'it adds' : 'they add'} nothing.`,
    );
  }

  return {
    period: {
      kind: p.kind,
      month: p.month,
      from: p.from,
      to: p.to,
      label: p.label,
      partial: p.partial,
    },
    filters: { category },
    cards: {
      total: {
        value,
        previous,
        changePct: changePct(value, previous),
        lastYear,
        yoyPct: changePct(value, lastYear),
      },
      largest,
      leafShare: { amount: leafRs, pct: pctOf(leafRs, value) },
      recovered: rec,
    },
    byCategory,
    trend,
    table: {
      groupBy: b.groupBy,
      rows: groupRows(lines, b.groupBy, value),
      totals: {
        records: lines.reduce((s, l) => s + l.records, 0),
        amount: value,
      },
    },
    netLeafCostRs: r2(leafRs - rec.transportRs),
    wagesEstimate,
    loans: loansIssued(i, p),
    stock: {
      uncosted: uncosted.length,
      uncostedKg: r2(uncosted.reduce((s, x) => s + x.quantityKg, 0)),
    },
    stockLost: b.stockLost,
    empty: {
      reason: value > 0 ? null : emptyReason(i, p, p.label, category),
      hints,
    },
    options: {
      categories: [
        ...new Set([
          ...Object.values(KIND_CATEGORY),
          ...b.categories,
          ...lines.map((l) => l.category),
        ]),
      ],
    },
  };
}
