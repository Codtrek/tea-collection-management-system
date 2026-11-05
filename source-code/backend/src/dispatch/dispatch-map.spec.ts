import {
  boardStatusOf,
  freshnessOf,
  localDate,
  localTime,
  orderStops,
  windowIncludes,
} from './dispatch-map';

describe('dispatch-map', () => {
  describe('freshnessOf — never claims "real-time"', () => {
    const now = new Date('2026-10-09T10:00:00Z');
    const ago = (min: number) => new Date(now.getTime() - min * 60_000);

    it('green under 5 min, amber 5–30, grey beyond, none when never seen', () => {
      expect(freshnessOf(ago(0), now).level).toBe('fresh');
      expect(freshnessOf(ago(4.9), now).level).toBe('fresh');
      expect(freshnessOf(ago(5), now).level).toBe('recent');
      expect(freshnessOf(ago(30), now).level).toBe('recent');
      expect(freshnessOf(ago(30.1), now).level).toBe('stale');
      expect(freshnessOf(null, now)).toEqual({ level: 'none', ageMin: null });
    });

    it('a device clock slightly ahead is treated as just now, not negative', () => {
      expect(freshnessOf(ago(-1), now)).toEqual({ level: 'fresh', ageMin: 0 });
    });
  });

  describe('boardStatusOf', () => {
    const base = {
      absent: false,
      covering: false,
      shiftStarted: false,
      shiftEnded: false,
      stopsDone: 0,
      stopsTotal: 4,
    };
    it('applies Absent > Completed > Covering > On route > Not started', () => {
      expect(boardStatusOf(base)).toBe('Not started');
      expect(boardStatusOf({ ...base, shiftStarted: true })).toBe('On route');
      expect(
        boardStatusOf({ ...base, shiftStarted: true, covering: true }),
      ).toBe('Covering');
      expect(boardStatusOf({ ...base, shiftStarted: true, stopsDone: 4 })).toBe(
        'Completed',
      );
      expect(boardStatusOf({ ...base, shiftEnded: true })).toBe('Completed');
      expect(
        boardStatusOf({
          ...base,
          shiftStarted: true,
          covering: true,
          absent: true,
        }),
      ).toBe('Absent');
    });
    it('a route with no stops today is not "Completed" by arithmetic alone', () => {
      expect(boardStatusOf({ ...base, stopsTotal: 0 })).toBe('Not started');
    });
  });

  describe('factory-local date', () => {
    it('uses Sri Lanka time, so late-evening UTC is already tomorrow', () => {
      expect(localDate(new Date('2026-10-08T19:00:00Z'))).toBe('2026-10-09');
      expect(localDate(new Date('2026-10-08T17:00:00Z'))).toBe('2026-10-08');
      expect(localTime(new Date('2026-10-08T19:00:00Z'))).toBe('00:30');
    });
  });

  it('windowIncludes handles open-ended and bounded windows', () => {
    expect(
      windowIncludes({ validFrom: '2026-10-01', validTo: null }, '2026-10-09'),
    ).toBe(true);
    expect(
      windowIncludes(
        { validFrom: '2026-10-09', validTo: '2026-10-09' },
        '2026-10-09',
      ),
    ).toBe(true);
    expect(
      windowIncludes(
        { validFrom: '2026-10-09', validTo: '2026-10-09' },
        '2026-10-10',
      ),
    ).toBe(false);
    expect(
      windowIncludes({ validFrom: '2026-10-10', validTo: null }, '2026-10-09'),
    ).toBe(false);
  });

  it('orderStops chains stops by nearest neighbour from the westernmost', () => {
    const stops = [
      { lat: 7.0, lng: 80.3 },
      { lat: 7.0, lng: 80.1 },
      { lat: 7.0, lng: 80.2 },
    ];
    expect(orderStops(stops).map((s) => s.lng)).toEqual([80.1, 80.2, 80.3]);
  });
});
