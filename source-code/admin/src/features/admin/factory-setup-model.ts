import type { VersionStatus } from './types'

/*
  Factory Setup's pure helpers (Administration-Addendum §1) — effective-dated versions as the
  server sees them, so the page can say "nothing would change" or "this starts today" before
  anyone presses Publish. Unit-tested in factory-setup-model.test.ts.
*/

interface Dated {
  effectiveDate: string
  status: VersionStatus
}

/** 'YYYY-MM-DD' + n days (calendar arithmetic, no time zones). */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** The live version a new one starting on `date` would follow (latest live one before it). */
export function versionBefore<T extends Dated>(rows: T[], date: string): T | null {
  return (
    rows
      .filter((r) => r.status !== 'cancelled' && r.effectiveDate < date)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0] ?? null
  )
}

/** The newest live version (current or scheduled) — what a new draft starts from. */
export function latestLive<T extends Dated>(rows: T[]): T | null {
  return rows.filter((r) => r.status !== 'cancelled').sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0] ?? null
}

/** A live version already starts on `date`. */
export function dateTaken<T extends Dated>(rows: T[], date: string): boolean {
  return rows.some((r) => r.status !== 'cancelled' && r.effectiveDate === date)
}

/** Shallow equality for flat drafts — an edit back to the starting values isn't "unsaved". */
export function sameDraft<T extends object>(a: T, b: T): boolean {
  const ka = Object.keys(a) as (keyof T)[]
  return ka.length === Object.keys(b).length && ka.every((k) => String(a[k]) === String(b[k]))
}

export const VERSION_BADGE: Record<VersionStatus, { label: string; tone: 'success' | 'warning' | 'neutral' } | null> = {
  current: { label: 'Current', tone: 'success' },
  scheduled: { label: 'Scheduled', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  past: null,
}

/** Factory Setup's tabs that hold unsaved drafts. */
export type DraftTab = 'general' | 'grades' | 'transport' | 'prices'
