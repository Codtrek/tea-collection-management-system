/**
 * A small iCalendar (RFC 5545) reader — just what the Sri Lanka holiday import needs
 * (Attendance-Leave-Addendum §4.5): all-day VEVENTs with UID, DTSTART, SUMMARY, DESCRIPTION.
 * Pure, no dependencies; used for Google's public feed and for an uploaded .ics file.
 */
export interface IcsEvent {
  uid: string;
  /** 'YYYY-MM-DD' */
  date: string;
  name: string;
  description: string;
}

/** Long lines are folded: a line starting with a space or tab continues the previous one. */
function unfold(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n');
}

/** TEXT values escape \\ , ; and newlines. */
function unescape(v: string): string {
  return v
    .replace(/\\n/gi, '\n')
    .replace(/\\([,;\\])/g, '$1')
    .trim();
}

/** 20260530 or 20260530T000000Z → 2026-05-30. */
function toDate(v: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(v.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function parseIcs(text: string): IcsEvent[] {
  const out: IcsEvent[] = [];
  let cur: Partial<IcsEvent> | null = null;
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') {
      cur = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (cur?.date && cur.name) {
        out.push({
          uid: cur.uid ?? `${cur.date}:${cur.name}`,
          date: cur.date,
          name: cur.name,
          description: cur.description ?? '',
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).split(';')[0].toUpperCase();
    const value = line.slice(colon + 1);
    if (key === 'UID') cur.uid = value.trim();
    else if (key === 'DTSTART') cur.date = toDate(value) ?? undefined;
    else if (key === 'SUMMARY') cur.name = unescape(value);
    else if (key === 'DESCRIPTION') cur.description = unescape(value);
  }
  return out;
}

/** Only the VEVENTs of one year — keeps an uploaded file small (the portal trims before sending). */
export function eventsInYear(events: IcsEvent[], year: number): IcsEvent[] {
  return events.filter((e) => e.date.startsWith(`${year}-`));
}

/**
 * A CSV fallback: `date,name[,type]` with an optional header row. Dates as YYYY-MM-DD.
 * Quoted fields may hold commas.
 */
export function parseCsv(
  text: string,
): (IcsEvent & { type?: 'poya' | 'public' })[] {
  const rows = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map(splitCsvLine);
  return rows
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r[0] ?? '') && r[1]?.trim())
    .map((r) => {
      const type = r[2]?.trim().toLowerCase();
      return {
        uid: `csv:${r[0]}:${r[1].trim().toLowerCase()}`,
        date: r[0],
        name: r[1].trim(),
        description: '',
        ...(type === 'poya' || type === 'public' ? { type } : {}),
      };
    });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
