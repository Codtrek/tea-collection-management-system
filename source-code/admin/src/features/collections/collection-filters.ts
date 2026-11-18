import { hasGrade } from './weights'
import type { CollectionRecord, TeaGrade } from './types'

/*
  COL-01's filters live in the URL, so a link can open the list already filtered and a filtered
  view survives going back (Dashboard-Addendum). Besides the four selects there are three
  link-only filters, shown as a removable chip: one delivery date, "dated N or more days ago",
  and "a correction request is waiting". Pure; tested in collection-filters.test.ts.
*/

export interface CollectionFilters {
  search: string
  route: string
  /** 'Super' | 'Normal' | 'Ungraded' | '' */
  grade: string
  status: string
  /** 'YYYY-MM-DD' — one delivery date */
  date: string
  /** dated this many days ago or earlier (on the factory calendar) */
  olderThan: number | null
  /** only deliveries with a pending grading-correction request */
  corrections: boolean
}

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

export function readCollectionFilters(p: URLSearchParams): CollectionFilters {
  const older = Number(p.get('olderThan'))
  return {
    search: p.get('q') ?? '',
    route: p.get('route') ?? '',
    grade: p.get('grade') ?? '',
    status: p.get('status') ?? '',
    date: isDate(p.get('date')) ? p.get('date')! : '',
    olderThan: Number.isInteger(older) && older > 0 ? older : null,
    corrections: p.get('corrections') === 'pending',
  }
}

export function collectionParams(f: CollectionFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.search) p.set('q', f.search)
  if (f.route) p.set('route', f.route)
  if (f.grade) p.set('grade', f.grade)
  if (f.status) p.set('status', f.status)
  if (f.date) p.set('date', f.date)
  if (f.olderThan) p.set('olderThan', String(f.olderThan))
  if (f.corrections) p.set('corrections', 'pending')
  return p
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** The rows the list shows. `today` is the factory date (`factoryToday()`). */
export function filterCollections(rows: CollectionRecord[], f: CollectionFilters, today: string): CollectionRecord[] {
  const q = f.search.toLowerCase()
  const cutoff = f.olderThan ? addDays(today, -f.olderThan) : null
  return rows.filter(
    (c) =>
      (c.estateName.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)) &&
      (!f.route || c.route === f.route) &&
      // "contains this grade" — a multi-grade delivery matches either of its grades; Ungraded = no lines
      (!f.grade || (f.grade === 'Ungraded' ? !c.graded : hasGrade(c, f.grade as TeaGrade))) &&
      (!f.status || c.status === f.status) &&
      (!f.date || c.date === f.date) &&
      (!cutoff || c.date <= cutoff) &&
      (!f.corrections || c.pendingCorrectionId !== undefined),
  )
}

/** The link-only filters, for the chip above the table. */
export function linkFilterLabels(f: CollectionFilters, fmtDate: (d: string) => string): string[] {
  return [
    f.date && `Delivered ${fmtDate(f.date)}`,
    f.olderThan && `Delivered ${f.olderThan} or more days ago`,
    f.corrections && 'Correction request waiting',
  ].filter((x): x is string => !!x)
}
