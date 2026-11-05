/*
  Pure helpers for the Sri Lanka holiday import (Attendance-Leave-Addendum §4.5). The server
  parses and judges everything; the browser only trims an uploaded .ics to the chosen year so
  the request stays small (Google's full feed covers seven years).
*/

/** Keeps the calendar header and only the VEVENTs that start in `year`. */
export function trimIcsToYear(text: string, year: number): string {
  const norm = text.replace(/\r\n/g, '\n')
  const parts = norm.split('BEGIN:VEVENT')
  const head = parts[0].trim()
  const events = parts
    .slice(1)
    .map((p) => `BEGIN:VEVENT${p.split('END:VCALENDAR')[0]}`.trim())
    .filter((e) => new RegExp(`^DTSTART[^:\\n]*:${year}\\d{4}`, 'm').test(e))
  return [head, ...events, 'END:VCALENDAR'].join('\n')
}

/** "13 Poya · 13 public" for the rows that will be saved. */
export function tickedCounts(rows: { type: 'poya' | 'public'; include: boolean }[]): { poya: number; public: number } {
  const t = rows.filter((r) => r.include)
  return { poya: t.filter((r) => r.type === 'poya').length, public: t.filter((r) => r.type === 'public').length }
}

/** Show the December reminder (and the button) for next year. */
export const isDecember = (today: string) => today.slice(5, 7) === '12'
