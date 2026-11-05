/**
 * Effective-dated versions (Administration-Addendum §1) — the one set of rules every money rate
 * follows: grade rates, transport rates, item prices and pay rates. Pure; tested in
 * versioning.spec.ts.
 *
 *  • a version applies from its effective date until the next one; history is never edited
 *  • a new version starts today or later (never in the past: it would re-price what already happened)
 *  • one live version per date, and never one identical to the version it would follow
 *  • a SCHEDULED version (starting after today) can be cancelled before it starts; it is kept,
 *    marked cancelled, and ignored from then on
 */
import { rateVersionFor } from '../estates/settlement-calc';

export interface Versioned {
  effectiveDate: string;
  cancelledAt?: Date | string | null;
}

export type VersionStatus = 'current' | 'scheduled' | 'past' | 'cancelled';

export const liveVersions = <T extends Versioned>(rows: T[]): T[] =>
  rows.filter((r) => !r.cancelledAt);

/** The live version in force on `date` (latest effective date on or before it), or null. */
export const versionInForce = <T extends Versioned>(
  rows: T[],
  date: string,
): T | null => rateVersionFor(liveVersions(rows), date);

/** The live version a new one starting on `date` would follow (the latest one before `date`). */
export function versionBefore<T extends Versioned>(
  rows: T[],
  date: string,
): T | null {
  return (
    liveVersions(rows)
      .filter((r) => r.effectiveDate < date)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0] ?? null
  );
}

export function versionStatus<T extends Versioned>(
  row: T,
  rows: T[],
  today: string,
): VersionStatus {
  if (row.cancelledAt) return 'cancelled';
  if (row.effectiveDate > today) return 'scheduled';
  return versionInForce(rows, today) === row ? 'current' : 'past';
}

export interface VersionRefusal {
  /** past / clash → the request is wrong; identical → nothing would change */
  kind: 'past' | 'clash' | 'identical' | 'reason';
  message: string;
}

/**
 * Why a new version can't be published, or null. `same` says whether a version carries exactly
 * the candidate's values; `noun` names the thing ("grade rate", "transport rate", "price for Urea").
 */
export function newVersionError<T extends Versioned>(
  rows: T[],
  effectiveDate: string,
  today: string,
  same: (v: T) => boolean,
  noun: string,
  reason: string | null | undefined,
): VersionRefusal | null {
  if (!reason?.trim()) {
    return { kind: 'reason', message: `Give a reason for the new ${noun}.` };
  }
  if (effectiveDate < today) {
    return {
      kind: 'past',
      message: `A new ${noun} can’t take effect in the past: it would change what was already charged or paid. Pick today or a later date.`,
    };
  }
  if (liveVersions(rows).some((r) => r.effectiveDate === effectiveDate)) {
    return {
      kind: 'clash',
      message: `A ${noun} version already starts on ${effectiveDate}. Versions are never edited: cancel it first (if it hasn’t started) or pick another date.`,
    };
  }
  const before = versionBefore(rows, effectiveDate);
  if (before && same(before)) {
    return {
      kind: 'identical',
      message: `This is the same as the ${noun} in force from ${before.effectiveDate}, so nothing would change.`,
    };
  }
  return null;
}

/** Why a version can't be cancelled, or null. Only a scheduled, live version can be. */
export function cancelError<T extends Versioned>(
  row: T,
  today: string,
  reason: string | null | undefined,
): string | null {
  if (row.cancelledAt) return 'This version is already cancelled.';
  if (row.effectiveDate <= today) {
    return 'This version has already started, so it can’t be cancelled. Publish a new version instead.';
  }
  if (!reason?.trim()) return 'Give a reason for cancelling this version.';
  return null;
}
