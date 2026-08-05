import type { DbGrade } from '../collections/collection-map';

/** One ADM-01 rate version (effective-dated). */
export interface RateVersion {
  effectiveDate: string; // 'YYYY-MM-DD'
  superRate: number;
  normalRate: number;
}

export interface PricedLine {
  grade: DbGrade;
  weightKg: number;
  rate: number;
  amountRs: number;
}

/**
 * The rate version in force on `date`: the newest one whose effective date is on or
 * before it. Past deliveries therefore keep pricing at the rate that applied then — a
 * newer version never reprices them (ADM-01's snapshot principle).
 */
export function rateVersionFor<T extends { effectiveDate: string }>(
  versions: T[],
  date: string,
): T | null {
  return (
    [...versions]
      .filter((v) => v.effectiveDate <= date)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0] ?? null
  );
}

/** Rate for one grade within a version. A future grade catalogue replaces just this lookup. */
export function rateFor(grade: DbGrade, version: RateVersion): number {
  return grade === 'super' ? version.superRate : version.normalRate;
}

/**
 * Gross revenue for one delivery = Σ (grade line weight × THAT grade's rate).
 * Ungraded deliveries (no lines) earn nothing yet — they can't be priced until the
 * factory grades them.
 */
export function computeGross(
  lines: { grade: DbGrade; weightKg: number }[],
  version: RateVersion,
): { grossRs: number; lines: PricedLine[] } {
  const priced = lines.map((l) => {
    const rate = rateFor(l.grade, version);
    return {
      grade: l.grade,
      weightKg: l.weightKg,
      rate,
      amountRs: Math.round(l.weightKg * rate * 100) / 100,
    };
  });
  return {
    grossRs: Math.round(priced.reduce((s, l) => s + l.amountRs, 0) * 100) / 100,
    lines: priced,
  };
}
