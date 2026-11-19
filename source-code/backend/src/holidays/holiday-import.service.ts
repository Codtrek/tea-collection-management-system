import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import type { ImportConfirmDto } from './dto/holiday-import.dto';
import { HolidayImportSkipEntity } from './holiday-import-skip.entity';
import { decide } from './holiday-permissions';
import type { HolidayActor } from './holiday.service';
import { HolidayEntity, type HolidaySource } from './holiday.entity';
import { eventsInYear, type IcsEvent, parseCsv, parseIcs } from './ical';
import {
  buildPreview,
  type DiffItem,
  diffFeed,
  type ExistingHoliday,
  type ImportType,
  type PreviewRow,
} from './import-rules';

/**
 * Google's public "Holidays in Sri Lanka" calendar as iCal — no API key. Verified 2026-11-05:
 * HTTP 200, events for 2021–2027, DESCRIPTION "Public holiday" or "Observance".
 */
export const SRI_LANKA_FEED =
  'https://calendar.google.com/calendar/ical/en.lk%23holiday%40group.v.calendar.google.com/public/basic.ics';

export const GAZETTE_NOTE =
  'The government gazette is the official source. Review before confirming.';

export interface ImportPreview {
  year: number;
  source: Exclude<HolidaySource, 'manual'>;
  feedUrl: string | null;
  note: string;
  rows: PreviewRow[];
}

/**
 * Import Sri Lanka holidays (Attendance-Leave-Addendum §4.5), all `holidayStatutory: edit`.
 * The feed is fetched on the server; if that's blocked, a .ics or CSV file is the fallback.
 * Nothing is saved until the Administrator confirms the reviewed rows; a re-sync lists the
 * differences one by one and never overwrites anything — manual holidays are never touched.
 */
@Injectable()
export class HolidayImportService {
  constructor(
    @InjectRepository(HolidayEntity)
    private readonly holidays: Repository<HolidayEntity>,
    @InjectRepository(HolidayImportSkipEntity)
    private readonly skips: Repository<HolidayImportSkipEntity>,
    private readonly access: DispatchAccessService,
    private readonly audit: AuditService,
  ) {}

  async previewGoogle(
    year: number,
    actor: HolidayActor,
  ): Promise<ImportPreview> {
    await this.requireStatutory(actor);
    const events = eventsInYear(await this.googleEvents(), year);
    return {
      year,
      source: 'google',
      feedUrl: SRI_LANKA_FEED,
      note: GAZETTE_NOTE,
      rows: buildPreview(events, await this.existing(year)),
    };
  }

  async previewFile(
    year: number,
    format: 'ics' | 'csv',
    content: string,
    actor: HolidayActor,
  ): Promise<ImportPreview> {
    await this.requireStatutory(actor);
    const events = eventsInYear(
      format === 'csv' ? parseCsv(content) : parseIcs(content),
      year,
    );
    if (events.length === 0) {
      throw new BadRequestException(`The file has no holidays for ${year}.`);
    }
    return {
      year,
      source: 'file',
      feedUrl: null,
      note: GAZETTE_NOTE,
      rows: buildPreview(events, await this.existing(year)),
    };
  }

  /** Saves the ticked rows (source + imported_at); remembers the unticked ones so re-sync skips them. */
  async confirm(
    dto: ImportConfirmDto,
    actor: HolidayActor,
    now: Date = new Date(),
  ) {
    await this.requireStatutory(actor);
    const live = (await this.holidays.find()).filter((h) => !h.cancelledAt);
    let added = 0;
    let skipped = 0;
    for (const r of dto.rows) {
      if (!r.date.startsWith(`${dto.year}-`)) {
        throw new BadRequestException(`${r.name} is not in ${dto.year}.`);
      }
      if (live.some((h) => h.externalUid === r.uid)) continue;
      if (r.include) {
        await this.holidays.save(this.newHoliday(r, dto.source, actor, now));
        added += 1;
      } else {
        await this.skip(dto.year, r, actor, now);
        skipped += 1;
      }
    }
    const counts = await this.counts(dto.year);
    await this.audit.record(actor, {
      action: `Imported ${dto.year} holidays`,
      module: 'Holidays',
      record:
        dto.source === 'google'
          ? 'Google: Holidays in Sri Lanka'
          : 'Uploaded file',
      recordHref: `/holidays?view=list&month=${dto.year}-01`,
      details: `${added} added, ${skipped} left out · ${dto.year} now has ${counts.poya} Poya and ${counts.public} public holidays`,
    });
    return { added, skipped, counts };
  }

  /** What differs between Google's feed and what was imported from it — for the Administrator to accept one by one. */
  async resync(year: number, actor: HolidayActor) {
    await this.requireStatutory(actor);
    return {
      year,
      note: GAZETTE_NOTE,
      items: await this.diff(year),
    };
  }

  /** Accept one difference. The item is looked up again on the server — the client only names it. */
  async acceptDiff(
    year: number,
    kind: DiffItem['kind'],
    uid: string,
    type: ImportType | undefined,
    actor: HolidayActor,
    now: Date = new Date(),
  ): Promise<void> {
    await this.requireStatutory(actor);
    const item = (await this.diff(year)).find(
      (d) => d.kind === kind && d.uid === uid,
    );
    if (!item)
      throw new NotFoundException('That difference is no longer there.');
    if (item.kind === 'added') {
      await this.holidays.save(
        this.newHoliday(
          { ...item, type: type ?? item.type },
          'google',
          actor,
          now,
        ),
      );
    } else {
      const h = await this.holidays.findOne({ where: { id: item.holidayId } });
      if (!h) throw new NotFoundException('That holiday is gone.');
      if (item.kind === 'removed') {
        Object.assign(h, {
          cancelledAt: now,
          cancelledBy: actor.name,
          cancelReason: 'Removed from Google’s “Holidays in Sri Lanka”',
        });
      } else {
        Object.assign(h, { date: item.date, name: item.name, importedAt: now });
      }
      await this.holidays.save(h);
    }
    await this.audit.record(actor, {
      action: `Re-sync: accepted ${item.kind === 'added' ? 'a new' : item.kind === 'removed' ? 'a removed' : 'a changed'} holiday`,
      module: 'Holidays',
      record: `${item.name} · ${item.date}`,
      recordHref: '/holidays?view=list',
      details:
        item.kind === 'changed'
          ? `was ${item.was.name} · ${item.was.date}`
          : undefined,
    });
  }

  /** Leave a new feed holiday out — it isn't offered again. */
  async ignoreDiff(
    year: number,
    uid: string,
    actor: HolidayActor,
    now: Date = new Date(),
  ) {
    await this.requireStatutory(actor);
    const item = (await this.diff(year)).find(
      (d) => d.kind === 'added' && d.uid === uid,
    );
    if (!item)
      throw new NotFoundException('That difference is no longer there.');
    await this.skip(year, item, actor, now);
  }

  /** Fetches Google's feed on the server (10 s). Overridden in tests. */
  protected async fetchFeed(): Promise<string> {
    let res: Response;
    try {
      res = await fetch(SRI_LANKA_FEED, {
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new BadGatewayException(
        'Couldn’t reach Google’s holiday calendar from the server — upload a .ics or CSV file instead.',
      );
    }
    if (!res.ok) {
      throw new BadGatewayException(
        `Google’s holiday calendar answered ${res.status} — upload a .ics or CSV file instead.`,
      );
    }
    return res.text();
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private async googleEvents(): Promise<IcsEvent[]> {
    return parseIcs(await this.fetchFeed());
  }

  private async diff(year: number): Promise<DiffItem[]> {
    const events = eventsInYear(await this.googleEvents(), year);
    const skipped = new Set(
      (await this.skips.find())
        .filter((s) => s.year === year)
        .map((s) => s.uid),
    );
    return diffFeed(events, await this.existing(year), skipped);
  }

  private async existing(year: number): Promise<ExistingHoliday[]> {
    return (await this.holidays.find())
      .filter((h) => h.date.startsWith(`${year}-`))
      .map((h) => ({
        id: h.id,
        date: h.date,
        name: h.name,
        type: h.type,
        source: h.source ?? 'manual',
        externalUid: h.externalUid ?? null,
        cancelled: !!h.cancelledAt,
      }));
  }

  private async counts(year: number) {
    const live = (await this.existing(year)).filter((h) => !h.cancelled);
    return {
      poya: live.filter((h) => h.type === 'poya').length,
      public: live.filter((h) => h.type === 'public').length,
      closure: live.filter((h) => h.type === 'closure').length,
    };
  }

  private newHoliday(
    r: { uid: string; date: string; name: string; type: ImportType },
    source: Exclude<HolidaySource, 'manual'>,
    actor: HolidayActor,
    now: Date,
  ): HolidayEntity {
    return this.holidays.create({
      date: r.date,
      name: r.name.trim().slice(0, 100),
      type: r.type,
      paid: null,
      workAllowed: null,
      appliesTo: 'all',
      collectionStops: false,
      declareGroup: null,
      reason: null,
      createdBy: actor.name,
      createdByUserId: actor.sub ?? null,
      source,
      externalUid: r.uid,
      importedAt: now,
      cancelledAt: null,
      cancelledBy: null,
      cancelReason: null,
    });
  }

  private async skip(
    year: number,
    r: { uid: string; date: string; name: string },
    actor: HolidayActor,
    now: Date,
  ): Promise<void> {
    if (await this.skips.findOne({ where: { uid: r.uid } })) return;
    await this.skips.save(
      this.skips.create({
        uid: r.uid,
        year,
        name: r.name.slice(0, 100),
        date: r.date,
        skippedBy: actor.name,
        skippedAt: now,
      }),
    );
  }

  private async requireStatutory(actor: HolidayActor): Promise<void> {
    const [calendar, statutory] = await Promise.all([
      this.access.levelFor(actor.role, 'holidayCalendar'),
      this.access.levelFor(actor.role, 'holidayStatutory'),
    ]);
    const o = decide('statutory', { calendar, statutory });
    if (o.kind === 'deny') throw new ForbiddenException(o.message);
  }
}
