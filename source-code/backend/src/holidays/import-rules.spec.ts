import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCsv, parseIcs } from './ical';
import {
  buildPreview,
  diffFeed,
  type ExistingHoliday,
  suggest,
  suspicious,
} from './import-rules';

// the real 2026 events from Google's public "Holidays in Sri Lanka" feed (fetched 2026-11-05)
const FEED = parseIcs(
  readFileSync(join(__dirname, 'testing', 'lk-holidays-2026.ics'), 'utf8'),
);

const existing = (over: Partial<ExistingHoliday>): ExistingHoliday => ({
  id: 1,
  date: '2026-05-30',
  name: 'Vesak Full Moon Poya Day',
  type: 'poya',
  source: 'google',
  externalUid: null,
  cancelled: false,
  ...over,
});

describe('iCal reader', () => {
  it('reads every 2026 event with its UID, date, name and description', () => {
    expect(FEED).toHaveLength(36);
    expect(FEED[0]).toEqual({
      uid: expect.stringMatching(/@google\.com$/) as string,
      date: '2026-01-03',
      name: 'Duruthu Full Moon Poya Day',
      description: 'Public holiday',
    });
  });

  it('unfolds long lines and unescapes text', () => {
    const [e] = parseIcs(
      'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:x1\r\nDTSTART;VALUE=DATE:20261225\r\nSUMMARY:Christmas\r\n  Day\r\nDESCRIPTION:Observance\\nTo hide\\, go\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n',
    );
    expect(e).toEqual({
      uid: 'x1',
      date: '2026-12-25',
      name: 'Christmas Day',
      description: 'Observance\nTo hide, go',
    });
  });

  it('reads the CSV fallback (date,name[,type]) with a header and quotes', () => {
    expect(
      parseCsv(
        'date,name,type\n2026-12-23,"Unduvap Full Moon Poya Day",poya\n2026-12-25,Christmas Day\nnot a row',
      ),
    ).toEqual([
      expect.objectContaining({
        date: '2026-12-23',
        name: 'Unduvap Full Moon Poya Day',
        type: 'poya',
      }),
      expect.objectContaining({ date: '2026-12-25', name: 'Christmas Day' }),
    ]);
  });
});

describe('type suggestions', () => {
  const rows = buildPreview(FEED, []);
  const by = (name: string) => rows.find((r) => r.name === name)!;

  it('Poya → Poya; national, mercantile and religious holidays → Public, ticked', () => {
    expect(by('Vesak Full Moon Poya Day')).toMatchObject({
      type: 'poya',
      include: true,
    });
    expect(by('Adhi Vesak Full Moon Poya Day')).toMatchObject({
      type: 'poya',
      include: true,
    });
    expect(by('National Day')).toMatchObject({ type: 'public', include: true });
    expect(by('Deepavali')).toMatchObject({ type: 'public', include: true });
    // "Day after Vesak … Poya Day" is a public holiday, not a Poya
    expect(by('Day after Vesak Full Moon Poya Day')).toMatchObject({
      type: 'public',
      include: true,
    });
  });

  it('observances and public-sector-only holidays are unticked', () => {
    expect(by("Valentine's Day")).toMatchObject({
      include: false,
      note: expect.stringMatching(/Observance/) as string,
    });
    expect(by('Easter Sunday')).toMatchObject({ include: false });
    expect(rows.filter((r) => r.name === 'Fuel Conservation Holiday')).toEqual([
      expect.objectContaining({ include: false }),
      expect.objectContaining({ include: false }),
      expect.objectContaining({ include: false }),
    ]);
    expect(
      suggest({ name: 'Special Bank Holiday', description: 'Public holiday' })
        .include,
    ).toBe(false);
  });

  it('2026: 13 Poya and 13 public ticked; 3 Fuel Conservation and 7 observances unticked', () => {
    const ticked = rows.filter((r) => r.include);
    expect(ticked.filter((r) => r.type === 'poya')).toHaveLength(13);
    expect(ticked.filter((r) => r.type === 'public')).toHaveLength(13);
    expect(rows.filter((r) => !r.include)).toHaveLength(10);
  });

  it('flags two holidays on one day, a clash with an existing holiday, and what is already imported', () => {
    const maySame = rows.filter((r) => r.date === '2026-05-01');
    expect(maySame.every((r) => r.sameDay)).toBe(true); // Adhi Vesak Poya + May Day
    const vesak = FEED.find((e) => e.name === 'Vesak Full Moon Poya Day')!;
    const again = buildPreview(FEED, [
      existing({ externalUid: vesak.uid }),
      existing({
        id: 2,
        date: '2026-12-25',
        name: 'Christmas',
        source: 'manual',
        type: 'public',
      }),
    ]);
    expect(again.find((r) => r.uid === vesak.uid)).toMatchObject({
      alreadyImported: true,
      include: false,
    });
    expect(again.find((r) => r.name === 'Christmas Day')?.conflict).toMatch(
      /Christmas is already/,
    );
  });
});

describe('re-sync', () => {
  const vesak = FEED.find((e) => e.name === 'Vesak Full Moon Poya Day')!;
  const pongal = FEED.find((e) => e.name === 'Tamil Thai Pongal Day')!;

  it('lists only the differences — added, changed date, removed — and never touches manual rows', () => {
    const local = [
      existing({ id: 1, externalUid: vesak.uid, date: '2026-05-29' }), // the feed moved it
      existing({
        id: 2,
        externalUid: 'gone@google.com',
        date: '2026-03-01',
        name: 'Old holiday',
        type: 'public',
      }),
      existing({
        id: 3,
        externalUid: null,
        source: 'manual',
        date: '2026-07-01',
        name: 'Factory day',
        type: 'public',
      }),
    ];
    const skipped = new Set(
      FEED.filter((e) => e.uid !== pongal.uid && e.uid !== vesak.uid).map(
        (e) => e.uid,
      ),
    );
    const diff = diffFeed(FEED, local, skipped);
    expect(diff).toEqual([
      expect.objectContaining({ kind: 'added', uid: pongal.uid }),
      expect.objectContaining({ kind: 'removed', holidayId: 2 }),
      expect.objectContaining({
        kind: 'changed',
        holidayId: 1,
        date: '2026-05-30',
        was: { date: '2026-05-29', name: 'Vesak Full Moon Poya Day' },
      }),
    ]);
    expect(diff.some((d) => 'holidayId' in d && d.holidayId === 3)).toBe(false);
  });

  it('nothing to do when everything matches', () => {
    const local = FEED.map((e, i) =>
      existing({
        id: i + 1,
        externalUid: e.uid,
        date: e.date,
        name: e.name.replace(/\s*\(tentative\)/i, ''),
      }),
    );
    expect(diffFeed(FEED, local, new Set())).toEqual([]);
  });
});

describe('data checks', () => {
  it('flags "Wesak" on 05 Nov 2026 — Wesak is in May', () => {
    expect(
      suspicious([
        existing({
          id: 1,
          date: '2026-11-05',
          name: 'Wesak',
          source: 'manual',
        }),
      ]),
    ).toEqual([
      {
        id: 1,
        date: '2026-11-05',
        name: 'Wesak',
        problem: '"Wesak" falls in May, not November',
      },
    ]);
  });

  it('allows a month of lunar drift, and flags duplicates and dates the feed disagrees with', () => {
    expect(suspicious([existing({ date: '2026-06-01' })])).toEqual([]); // Vesak in early June: fine
    const out = suspicious(
      [
        existing({
          id: 1,
          date: '2026-02-04',
          name: 'National Day',
          type: 'public',
          source: 'manual',
        }),
        existing({
          id: 2,
          date: '2026-02-05',
          name: 'National Day',
          type: 'public',
          source: 'manual',
        }),
      ],
      FEED,
    );
    expect(out.map((s) => s.problem)).toEqual([
      'Duplicate of National Day on 2026-02-04',
      'Google has "National Day" on 2026-02-04',
    ]);
  });
});
