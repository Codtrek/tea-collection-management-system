/**
 * DB ↔ portal mapping + shared helpers for the Reports module (RPT-01..04).
 * Reports are pure aggregation, so this file mostly holds the portal-facing
 * response shapes plus the month-key helpers the service buckets trends by.
 * Periods are exchanged with the portal as `YYYY-MM` keys; `settlements` and
 * `payroll_runs` store a `'Month YYYY'` label, so we convert between the two.
 */

export type ExpenseCategory =
  | 'Utilities'
  | 'Maintenance'
  | 'Miscellaneous'
  | 'Other';

export type ExpenseSource = 'Manual' | 'Payroll run' | 'Settlement run';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** 'EXP-2026-0001' — formatted from a running sequence, embedding the entry year. */
export function formatExpenseId(year: number, seq: number): string {
  return `EXP-${year}-${String(seq).padStart(4, '0')}`;
}

/** 'YYYY-MM-DD' (or a Date) → 'YYYY-MM' bucket key. */
export function monthKeyOfDate(date: string | Date): string {
  const iso = typeof date === 'string' ? date : date.toISOString();
  return iso.slice(0, 7);
}

/** 'YYYY-MM' → 'July 2026' (the label `settlements`/`payroll_runs` store). */
export function keyToLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

/** 'July 2026' → 'YYYY-MM'. Returns '' if the label is unparseable. */
export function labelToKey(label: string): string {
  const [name, year] = label.trim().split(/\s+/);
  const idx = MONTHS.indexOf(name);
  if (idx < 0 || !year) return '';
  return `${year}-${String(idx + 1).padStart(2, '0')}`;
}

/** 'YYYY-MM' → 'Jul' (trend x-axis label). */
export function shortMonth(key: string): string {
  const month = Number(key.split('-')[1]);
  return MONTHS[month - 1]?.slice(0, 3) ?? key;
}

/** 'YYYY-MM' → the preceding month's key. */
export function prevMonthKey(key: string): string {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ── Portal-facing shapes ─────────────────────────────────────────── */

export interface TrendPoint {
  month: string; // short label, e.g. 'Jul'
  value: number;
}

export interface CollectionReport {
  period: string; // 'YYYY-MM'
  totalKg: number;
  avgPerEstate: number;
  topEstate: { estate: string; kg: number } | null;
  gradeSplit: { superPct: number; normalPct: number };
  trend: TrendPoint[];
  byEstate: { estate: string; kg: number }[]; // YTD
  rows: { estate: string; deliveries: number; kg: number; superPct: number }[];
}

export interface RevenueReport {
  period: string;
  totalRevenue: number;
  avgPerEstate: number;
  prevRevenue: number | null;
  deltaPercent: number | null;
  trend: TrendPoint[];
  byEstate: { estate: string; revenue: number }[];
  rows: { estate: string; superRs: number; normalRs: number; gross: number }[];
}

export interface ExpenseRow {
  id: string;
  category: ExpenseCategory | 'Payroll' | 'Fertilizer' | 'Transport';
  description: string;
  amount: number;
  date: string;
  enteredBy: string;
  source: ExpenseSource;
}

export interface ExpenseReport {
  period: string;
  total: number;
  manualTotal: number;
  largest: { category: string; amount: number } | null;
  deltaPercent: number | null;
  split: { category: string; amount: number }[];
  trend: TrendPoint[];
  rows: ExpenseRow[];
}

export interface PublicExpenseEntry {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  enteredBy: string;
  source: 'Manual';
}
