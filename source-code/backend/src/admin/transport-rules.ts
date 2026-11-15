/**
 * Transport (Administration-Addendum §4) — a FIXED MONTHLY charge per estate. Pure; tested in
 * transport-rules.spec.ts.
 *
 *  • one versioned amount, the same for every estate ("Monthly transport charge per estate")
 *  • a version applies from the first month that starts on or after its effective date; the
 *    portal stores the 1st of a month, so there are no mid-month splits
 *  • an estate is charged ONCE for a settlement month in which it delivered at least once; no
 *    deliveries = no charge; self-delivery estates are exempt
 *  • no version covering the month = "not configured": settlement processing stops for estates
 *    that pay transport — never a silent Rs. 0
 *  • taken in its place in the deduction order, never more than what's left; the rest is
 *    carried forward to the estate's next settlement
 *
 * `basis` keeps per km / per kg for the future, but only 'fixed_month' is calculated today.
 */
import { liveVersions, type Versioned } from './versioning';

export type TransportBasis = 'per_km' | 'per_kg' | 'fixed_month';

export interface TransportVersion extends Versioned {
  id: number;
  basis: TransportBasis;
  /** fixed_month: the monthly charge per estate (Rs) */
  rate: number;
  minimumCharge: number;
  basisConfirmed: boolean;
  neverApplied: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** 'YYYY-MM' → the month its version starts charging (the first month starting on/after the date). */
export function firstChargedMonth(effectiveDate: string): string {
  const [y, m, d] = effectiveDate.split('-').map(Number);
  if (d === 1) return effectiveDate.slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The version charging month `month` ('YYYY-MM'): the latest live fixed-monthly one that covers it. */
export function versionForMonth(
  versions: TransportVersion[],
  month: string,
): TransportVersion | null {
  return (
    liveVersions(versions)
      .filter(
        (v) =>
          v.basis === 'fixed_month' &&
          firstChargedMonth(v.effectiveDate) <= month,
      )
      .sort(
        (a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.id - a.id,
      )[0] ?? null
  );
}

export interface TransportStatus {
  configured: boolean;
  /** why not, in words for the page */
  reason: string | null;
  version: TransportVersion | null;
}

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
export const monthLabel = (m: string) =>
  `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

export function transportStatus(
  versions: TransportVersion[],
  month: string,
): TransportStatus {
  const version = versionForMonth(versions, month);
  return version
    ? { configured: true, reason: null, version }
    : {
        configured: false,
        reason: `Transport: not configured. No monthly transport charge covers ${monthLabel(month)} (Factory Setup → Transport Rates).`,
        version: null,
      };
}

export type TransportLineStatus =
  | 'charged'
  | 'exempt'
  | 'no_deliveries'
  | 'not_configured';

export interface MonthlyCharge {
  status: TransportLineStatus;
  /** this month's charge (0 when exempt / no deliveries / not configured) */
  charge: number;
  version: TransportVersion | null;
}

/** What an estate owes for transport for one settlement month. */
export function monthlyCharge(i: {
  versions: TransportVersion[];
  month: string;
  selfDelivery: boolean;
  deliveries: number;
}): MonthlyCharge {
  if (i.selfDelivery) return { status: 'exempt', charge: 0, version: null };
  const version = versionForMonth(i.versions, i.month);
  if (!version) return { status: 'not_configured', charge: 0, version: null };
  if (i.deliveries === 0)
    return { status: 'no_deliveries', charge: 0, version };
  return { status: 'charged', charge: r2(version.rate), version };
}

/**
 * Transport taken from a settlement. The order is adjustment → transport → fertilizer →
 * advances, but while the fertilizer and advance deductions are stored figures (no settlement
 * generator yet) they can't shrink — so transport is the step that gives way: it never takes
 * more than gross + adjustment − those stored deductions, net is never below Rs. 0, and what
 * isn't taken is carried forward to the estate's next settlement.
 */
export function takeTransport(i: {
  due: number;
  gross: number;
  adjustment: number;
  /** the settlement's other (stored) deductions: fertilizer + advances */
  others: number;
}): { taken: number; carriedOut: number } {
  const due = Math.max(0, r2(i.due));
  const room = Math.max(0, r2(i.gross + i.adjustment - i.others));
  const taken = r2(Math.min(due, room));
  return { taken, carriedOut: r2(due - taken) };
}

/** What the settlement page shows for transport: one line, frozen or live. */
export interface PublicTransportLine {
  status: TransportLineStatus;
  /** the month's charge */
  charge: number;
  /** carried in from the estate's last processed settlement */
  carriedIn: number;
  /** taken from this settlement */
  taken: number;
  /** left owing, carried to the next settlement */
  carriedOut: number;
  versionId: number | null;
  /** 'YYYY-MM' the version charges from */
  versionMonth: string | null;
  /** frozen at processing (true) or worked out live for a pending settlement (false) */
  frozen: boolean;
}

/** A `transport_rates` row (DB decimals arrive as strings) → the rules' shape. */
export function toTransportVersion(r: {
  id: number;
  effectiveDate: string;
  cancelledAt: Date | null;
  basis: TransportBasis;
  rate: string | number;
  minimumCharge: string | number;
  basisConfirmed: boolean;
  neverApplied?: boolean | null;
}): TransportVersion {
  return {
    id: r.id,
    effectiveDate: r.effectiveDate,
    cancelledAt: r.cancelledAt,
    basis: r.basis,
    rate: Number(r.rate),
    minimumCharge: Number(r.minimumCharge),
    basisConfirmed: r.basisConfirmed,
    neverApplied: !!r.neverApplied,
  };
}
