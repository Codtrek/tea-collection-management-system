import { BadGatewayException, ForbiddenException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Repository } from 'typeorm';
import type { PermissionLevel } from '../admin/admin-map';
import type { AuditService } from '../audit/audit.service';
import type { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { HolidayImportService } from './holiday-import.service';

const FEED = readFileSync(
  join(__dirname, 'testing', 'lk-holidays-2026.ics'),
  'utf8',
);

function fake<T extends object>(rows: T[] = []) {
  let seq = 100;
  const match = (r: T, where?: Partial<T>) =>
    !where ||
    Object.entries(where).every(
      ([k, v]) => (r as Record<string, unknown>)[k] === v,
    );
  return {
    rows,
    find: () => Promise.resolve([...rows]),
    findOne: (o: { where: Partial<T> }) =>
      Promise.resolve(rows.find((r) => match(r, o.where)) ?? null),
    create: (p: Partial<T>) => ({ ...p }) as T,
    save: (r: T) => {
      const x = r as { id?: number };
      if (x.id === undefined) x.id = seq++;
      if (!rows.includes(r)) rows.push(r);
      return Promise.resolve(r);
    },
  };
}

const LEVELS: Record<string, Record<string, PermissionLevel>> = {
  Administrator: { holidayCalendar: 'approve', holidayStatutory: 'approve' },
  Manager: { holidayCalendar: 'edit', holidayStatutory: 'view' },
};
const admin = { name: 'A. Bandara', role: 'Administrator' as const, sub: 1 };
const manager = { name: 'R. Jayasuriya', role: 'Manager' as const, sub: 3 };
const NOW = new Date('2026-11-05T06:00:00Z');

type Row = {
  id?: number;
  date: string;
  name: string;
  type: string;
  source: string;
  externalUid: string | null;
  cancelledAt: Date | null;
};

function setup(feed: string | Error = FEED, rows: Row[] = []) {
  const holidays = fake<Row>(rows);
  const skips = fake<{ uid: string; year: number }>();
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const access = {
    levelFor: jest.fn((role: string, module: string) =>
      Promise.resolve(LEVELS[role]?.[module] ?? 'none'),
    ),
  };
  class Testable extends HolidayImportService {
    protected fetchFeed(): Promise<string> {
      return feed instanceof Error
        ? Promise.reject(feed)
        : Promise.resolve(feed);
    }
  }
  const service = new Testable(
    holidays as unknown as Repository<never>,
    skips as unknown as Repository<never>,
    access as unknown as DispatchAccessService,
    audit as unknown as AuditService,
  );
  return { service, holidays, skips, audit };
}

describe('HolidayImportService', () => {
  it('only the Administrator (holidayStatutory: edit) may import', async () => {
    const { service } = setup();
    await expect(service.previewGoogle(2026, manager)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('imports the reviewed rows with source = google and imported_at; unticked rows are remembered', async () => {
    const { service, holidays, skips, audit } = setup();
    const preview = await service.previewGoogle(2026, admin);
    expect(preview.note).toMatch(/gazette is the official source/);
    const result = await service.confirm(
      { year: 2026, source: 'google', rows: preview.rows },
      admin,
      NOW,
    );
    expect(result).toEqual({
      added: 26,
      skipped: 10,
      counts: { poya: 13, public: 13, closure: 0 },
    });
    expect(holidays.rows[0]).toMatchObject({
      source: 'google',
      importedAt: NOW,
      createdBy: 'A. Bandara',
      externalUid: expect.stringMatching(/@google\.com$/) as string,
    });
    expect(skips.rows).toHaveLength(10);
    expect(audit.record).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ action: 'Imported 2026 holidays' }),
    );

    // a second import of the same year adds nothing
    const again = await service.previewGoogle(2026, admin);
    expect(again.rows.filter((r) => r.include)).toEqual([]);
    expect(
      (
        await service.confirm(
          { year: 2026, source: 'google', rows: again.rows },
          admin,
          NOW,
        )
      ).added,
    ).toBe(0);
  });

  it('re-sync shows only differences and changes nothing until each is accepted; manual rows untouched', async () => {
    const { service, holidays } = setup();
    const preview = await service.previewGoogle(2026, admin);
    await service.confirm(
      { year: 2026, source: 'google', rows: preview.rows },
      admin,
      NOW,
    );
    expect((await service.resync(2026, admin)).items).toEqual([]);

    // someone moved an imported holiday; a manual one sits beside it
    const vesak = holidays.rows.find(
      (h) => h.name === 'Vesak Full Moon Poya Day',
    )!;
    vesak.date = '2026-05-29';
    holidays.rows.push({
      date: '2026-05-29',
      name: 'Factory anniversary',
      type: 'public',
      source: 'manual',
      externalUid: null,
      cancelledAt: null,
    });
    const { items } = await service.resync(2026, admin);
    expect(items).toEqual([
      expect.objectContaining({
        kind: 'changed',
        date: '2026-05-30',
        was: { date: '2026-05-29', name: 'Vesak Full Moon Poya Day' },
      }),
    ]);
    expect(vesak.date).toBe('2026-05-29'); // not overwritten by looking

    await service.acceptDiff(
      2026,
      'changed',
      items[0].uid,
      undefined,
      admin,
      NOW,
    );
    expect(vesak.date).toBe('2026-05-30');
    expect(
      holidays.rows.find((h) => h.name === 'Factory anniversary'),
    ).toMatchObject({
      date: '2026-05-29',
      cancelledAt: null,
    });
  });

  it('a holiday Google dropped is offered as "removed"; accepting cancels it', async () => {
    const { service, holidays } = setup(FEED, [
      {
        id: 1,
        date: '2026-03-03',
        name: 'Dropped holiday',
        type: 'public',
        source: 'google',
        externalUid: 'gone@google.com',
        cancelledAt: null,
      },
    ]);
    const { items } = await service.resync(2026, admin);
    const removed = items.find((i) => i.kind === 'removed')!;
    expect(removed).toMatchObject({ holidayId: 1 });
    await service.acceptDiff(
      2026,
      'removed',
      removed.uid,
      undefined,
      admin,
      NOW,
    );
    expect(holidays.rows[0].cancelledAt).toEqual(NOW);
  });

  it('when Google can’t be reached it asks for a file instead; a .ics / CSV upload previews the same way', async () => {
    const { service } = setup(new BadGatewayException('blocked'));
    await expect(service.previewGoogle(2026, admin)).rejects.toThrow(
      BadGatewayException,
    );
    const ics = await service.previewFile(2026, 'ics', FEED, admin);
    expect(ics).toMatchObject({ source: 'file', feedUrl: null });
    expect(ics.rows).toHaveLength(36);
    const csv = await service.previewFile(
      2026,
      'csv',
      'date,name,type\n2026-12-23,Unduvap Full Moon Poya Day,poya\n2026-12-25,Christmas Day,public',
      admin,
    );
    expect(csv.rows.map((r) => [r.name, r.type, r.include])).toEqual([
      ['Unduvap Full Moon Poya Day', 'poya', true],
      ['Christmas Day', 'public', true],
    ]);
  });
});
