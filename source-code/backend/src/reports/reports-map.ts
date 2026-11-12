/**
 * DB ↔ portal mapping + shared helpers for the Reports module (RPT-01..04): the month-key
 * helpers (`settlements` and `payroll_runs` store a `'Month YYYY'` label; the portal exchanges
 * `YYYY-MM` keys) and the daily expense entry shapes. Report shapes live with their rules
 * (collection-report-rules, leaf-purchase-rules, finance-rules).
 */

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

/* ── Portal-facing shapes (RPT-04 daily expense entries) ───────────── */

export interface PublicExpenseCategory {
  id: number;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface PublicExpenseEntry {
  id: string;
  categoryId: number;
  category: string;
  description: string;
  amount: number;
  date: string;
  paidVia: 'cash' | 'bank' | null;
  enteredBy: string;
  /** factory day it was logged — the edit window counts from here */
  loggedOn: string;
  updatedBy: string | null;
  updatedAt: string | null;
  editReason: string | null;
  receipt: { fileName: string; mimeType: string; sizeBytes: number } | null;
  /** what the viewer may do with it (Finance-Reports-Addendum §7) */
  access: { canEdit: boolean; needsReason: boolean; note: string | null };
  editWindowDays: number;
}
