import type { IcsEvent } from './ical';

/**
 * The Sri Lanka holiday import's rules (Attendance-Leave-Addendum §4.5) — pure, so they are
 * unit-tested against the real 2026 feed (testing/lk-holidays-2026.ics).
 *   • a name with "Poya" → Poya day (but "Day after … Poya" is a public holiday)
 *   • a Google "Public holiday" → Public, ticked
 *   • observances (Valentine's Day, Mother's Day …) and holidays that look bank-only or
 *     public-sector-only (Fuel Conservation, Bank holiday …) → unticked, for the Administrator
 * Nothing is saved without the Administrator's review; a re-sync only lists differences.
 */

export type ImportType = 'poya' | 'public';

export interface Suggestion {
  type: ImportType;
  include: boolean;
  /** why it is unticked, for the preview */
  note: string | null;
  tentative: boolean;
}

const LIMITED =
  /\b(bank|public sector|government sector|fuel conservation|special (bank|public) holiday)\b/i;

export function suggest(e: Pick<IcsEvent, 'name' | 'description'>): Suggestion {
  const tentative =
    /tentative/i.test(e.name) || /tentative/i.test(e.description);
  const isPoya = /\bpoya\b/i.test(e.name) && !/^day after\b/i.test(e.name);
  const type: ImportType = isPoya ? 'poya' : 'public';
  if (/^observance/i.test(e.description)) {
    return {
      type,
      include: false,
      note: 'Observance — not a holiday',
      tentative,
    };
  }
  if (LIMITED.test(e.name)) {
    return {
      type,
      include: false,
      note: 'Looks bank-only or public-sector-only — check the gazette',
      tentative,
    };
  }
  return { type, include: true, note: null, tentative };
}

/** "Eid al-Fitr (tentative)" → "Eid al-Fitr". */
export const cleanName = (name: string) =>
  name.replace(/\s*\(tentative\)\s*/i, '').trim();

export interface ExistingHoliday {
  id: number;
  date: string;
  name: string;
  type: 'poya' | 'public' | 'closure';
  source: 'manual' | 'google' | 'file';
  externalUid: string | null;
  cancelled: boolean;
}

export interface PreviewRow {
  uid: string;
  date: string;
  name: string;
  type: ImportType;
  include: boolean;
  note: string | null;
  tentative: boolean;
  /** already imported (same UID) — saving skips it */
  alreadyImported: boolean;
  /** another live holiday is on the same date */
  conflict: string | null;
  /** the feed has more than one holiday that day */
  sameDay: boolean;
}

/** The review table for a year: one row per event, with its suggestion and flags. */
export function buildPreview(
  events: (IcsEvent & { type?: ImportType })[],
  existing: ExistingHoliday[],
): PreviewRow[] {
  const live = existing.filter((h) => !h.cancelled);
  const perDay = new Map<string, number>();
  for (const e of events) perDay.set(e.date, (perDay.get(e.date) ?? 0) + 1);
  return [...events]
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name),
    )
    .map((e) => {
      const s = suggest(e);
      const already = live.some((h) => h.externalUid === e.uid);
      const other = live.find(
        (h) => h.date === e.date && h.externalUid !== e.uid,
      );
      return {
        uid: e.uid,
        date: e.date,
        name: cleanName(e.name),
        type: e.type ?? s.type,
        include: s.include && !already,
        note: already ? 'Already imported' : s.note,
        tentative: s.tentative,
        alreadyImported: already,
        conflict: other ? `${other.name} is already on this date` : null,
        sameDay: (perDay.get(e.date) ?? 0) > 1,
      };
    });
}

export type DiffItem =
  | {
      kind: 'added';
      uid: string;
      date: string;
      name: string;
      type: ImportType;
      include: boolean;
      note: string | null;
    }
  | {
      kind: 'removed';
      uid: string;
      holidayId: number;
      date: string;
      name: string;
    }
  | {
      kind: 'changed';
      uid: string;
      holidayId: number;
      date: string;
      name: string;
      was: { date: string; name: string };
    };

/**
 * Re-sync: what differs between the feed and the holidays imported from it. Only
 * Google-sourced rows are compared — manual holidays are never touched — and skipped
 * (unticked) events are not offered again.
 */
export function diffFeed(
  events: IcsEvent[],
  existing: ExistingHoliday[],
  skipped: Set<string>,
): DiffItem[] {
  const imported = existing.filter(
    (h) => h.source === 'google' && !h.cancelled,
  );
  const feed = new Map(events.map((e) => [e.uid, e]));
  const out: DiffItem[] = [];
  for (const e of events) {
    const mine = imported.find((h) => h.externalUid === e.uid);
    const name = cleanName(e.name);
    if (!mine) {
      if (skipped.has(e.uid)) continue;
      const s = suggest(e);
      out.push({
        kind: 'added',
        uid: e.uid,
        date: e.date,
        name,
        type: s.type,
        include: s.include,
        note: s.note,
      });
    } else if (mine.date !== e.date || mine.name !== name) {
      out.push({
        kind: 'changed',
        uid: e.uid,
        holidayId: mine.id,
        date: e.date,
        name,
        was: { date: mine.date, name: mine.name },
      });
    }
  }
  for (const h of imported) {
    if (h.externalUid && !feed.has(h.externalUid)) {
      out.push({
        kind: 'removed',
        uid: h.externalUid,
        holidayId: h.id,
        date: h.date,
        name: h.name,
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// ── data checks ───────────────────────────────────────────────────────────

/** The month each Poya falls in (it drifts with the lunar calendar — ±1 month is allowed). */
const POYA_MONTH: [RegExp, number][] = [
  [/duruthu/i, 1],
  [/navam/i, 2],
  [/m[ae]din/i, 3],
  [/\bbak\b/i, 4],
  [/[vw]esak/i, 5],
  [/poson/i, 6],
  [/[ae]sala/i, 7],
  [/nikini/i, 8],
  [/binara/i, 9],
  [/\bvap\b/i, 10],
  [/\bil\b/i, 11],
  [/unduvap/i, 12],
];

export interface Suspicious {
  id: number;
  date: string;
  name: string;
  problem: string;
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

/**
 * Rows to check by hand (never changed automatically): a Poya name on a date that doesn't fit
 * it (e.g. "Wesak" in November), the same holiday twice, or a local holiday the feed has on
 * another date.
 */
export function suspicious(
  holidays: ExistingHoliday[],
  feed: IcsEvent[] = [],
): Suspicious[] {
  const live = holidays.filter((h) => !h.cancelled && h.type !== 'closure');
  const out: Suspicious[] = [];
  for (const h of live) {
    const hit = POYA_MONTH.find(([re]) => re.test(h.name));
    if (hit && !/^day after\b/i.test(h.name)) {
      const month = Number(h.date.slice(5, 7));
      const gap = Math.min(
        Math.abs(month - hit[1]),
        12 - Math.abs(month - hit[1]),
      );
      if (gap > 1) {
        out.push({
          ...pick(h),
          problem: `"${h.name}" falls in ${MONTHS[hit[1] - 1]}, not ${MONTHS[month - 1]}`,
        });
      }
    }
    const twin = live.find(
      (o) =>
        o.id < h.id &&
        o.name.toLowerCase() === h.name.toLowerCase() &&
        o.date.slice(0, 4) === h.date.slice(0, 4),
    );
    if (twin) {
      out.push({
        ...pick(h),
        problem: `Duplicate of ${twin.name} on ${twin.date}`,
      });
    }
    const elsewhere = feed.find(
      (e) =>
        cleanName(e.name).toLowerCase() === h.name.toLowerCase() &&
        e.date !== h.date &&
        e.date.slice(0, 4) === h.date.slice(0, 4),
    );
    if (elsewhere) {
      out.push({
        ...pick(h),
        problem: `Google has "${h.name}" on ${elsewhere.date}`,
      });
    }
  }
  return out;
}

const pick = (h: ExistingHoliday) => ({ id: h.id, date: h.date, name: h.name });
