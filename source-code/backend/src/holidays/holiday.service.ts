import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AppRole } from '../auth/role-map';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { localDate } from '../dispatch/dispatch-map';
import { DispatchNotifier } from '../dispatch/dispatch-notifier.service';
import { RouteResolverService } from '../dispatch/route-resolver.service';
import { RouteScheduleOverrideEntity } from '../dispatch/route-schedule.entity';
import { RouteScheduleService } from '../dispatch/route-schedule.service';
import { EmployeeAttendanceEntity } from '../employees/employee-attendance.entity';
import { EmployeeEntity } from '../employees/employee.entity';
import { RouteEntity } from '../estates/route.entity';
import { FertilizerDeliveryService } from '../fertilizer/fertilizer-delivery.service';
import type {
  DeclareHolidayDto,
  HolidayDto,
  HolidayTypeDto,
  RestDayDto,
  WeeklyRuleDto,
} from './dto/holiday.dto';
import { EmployeeRestDayEntity } from './employee-rest-day.entity';
import { HolidayTypeEntity } from './holiday-type.entity';
import { HolidayEntity } from './holiday.entity';
import { WeeklyHolidayRuleEntity } from './weekly-holiday-rule.entity';
import {
  type CalendarFacts,
  datesBetween,
  DEFAULT_TYPES,
  dayInfo,
} from './working-days';

export interface HolidayActor {
  name: string;
  role: AppRole;
  sub?: number | null;
}

export interface PublicHoliday {
  id: number;
  date: string;
  name: string;
  type: HolidayEntity['type'];
  paid: boolean;
  workAllowed: boolean;
  appliesTo: HolidayEntity['appliesTo'];
  collectionStops: boolean;
  declareGroup: string | null;
  reason: string | null;
  createdBy: string | null;
  cancelled: boolean;
  cancelReason: string | null;
}

export interface DeclarePreview {
  dates: string[];
  /** attendance already marked on those dates — keep as "Worked on holiday" or clear */
  attendance: {
    employeeId: string;
    name: string;
    date: string;
    status: string;
  }[];
  /** route collection days that would be cancelled (when collection stops) */
  routeDays: { routeId: number; routeName: string; date: string }[];
}

const CANCEL_TAG = 'Holiday:';
const fmtEmp = (id: number) => `EMP-${String(id).padStart(4, '0')}`;

/**
 * The holiday calendar (Attendance-Leave-Addendum §Holidays): Poya / public holidays per year,
 * the per-type paid / work-allowed defaults, the weekly holiday per category (effective-from),
 * per-employee rest days, and "Declare holiday" for sudden closures. Every write needs
 * `holidayCalendar: edit` (the Factory Manager — data-driven, checked here, not only in the UI)
 * and is audited. `facts()` is what attendance, leave and payroll read (working-days.ts).
 */
@Injectable()
export class HolidayService {
  constructor(
    @InjectRepository(HolidayEntity)
    private readonly holidays: Repository<HolidayEntity>,
    @InjectRepository(HolidayTypeEntity)
    private readonly types: Repository<HolidayTypeEntity>,
    @InjectRepository(WeeklyHolidayRuleEntity)
    private readonly weekly: Repository<WeeklyHolidayRuleEntity>,
    @InjectRepository(EmployeeRestDayEntity)
    private readonly restDays: Repository<EmployeeRestDayEntity>,
    @InjectRepository(EmployeeAttendanceEntity)
    private readonly attendance: Repository<EmployeeAttendanceEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly employees: Repository<EmployeeEntity>,
    @InjectRepository(RouteEntity)
    private readonly routes: Repository<RouteEntity>,
    @InjectRepository(RouteScheduleOverrideEntity)
    private readonly overrides: Repository<RouteScheduleOverrideEntity>,
    private readonly access: DispatchAccessService,
    private readonly schedule: RouteScheduleService,
    private readonly resolver: RouteResolverService,
    private readonly notifier: DispatchNotifier,
    private readonly deliveries: FertilizerDeliveryService,
    private readonly audit: AuditService,
  ) {}

  // ── reads ───────────────────────────────────────────────────────────────

  /** Everything the working-day rule needs for dates in [from, to]. */
  async facts(from: string, to: string): Promise<CalendarFacts> {
    const [rows, typeRows, weekly, rest] = await Promise.all([
      this.holidays.find(),
      this.types.find(),
      this.weekly.find(),
      this.restDays.find(),
    ]);
    const types = this.typeMap(typeRows);
    return {
      holidays: rows
        .filter((h) => !h.cancelledAt && h.date >= from && h.date <= to)
        .map((h) => ({
          date: h.date,
          name: h.name,
          type: h.type,
          paid: h.paid ?? types[h.type].paid,
          workAllowed: h.workAllowed ?? types[h.type].workAllowed,
          appliesTo: h.appliesTo,
        })),
      weekly: weekly.map((w) => ({
        category: w.category,
        weekdays: w.weekdays.map(Number),
        halfDayWeekday: w.halfDayWeekday,
        effectiveFrom: w.effectiveFrom,
      })),
      restDays: rest.map((r) => ({
        employeeId: r.employeeId,
        weekday: r.weekday,
        effectiveFrom: r.effectiveFrom,
      })),
      types,
    };
  }

  /** The calendar page: a year's holidays, the type defaults, weekly rules, rest days. */
  async year(year: number, now: Date = new Date()) {
    const [rows, typeRows, weekly, rest, employees] = await Promise.all([
      this.holidays.find(),
      this.types.find(),
      this.weekly.find(),
      this.restDays.find(),
      this.employees.find(),
    ]);
    const types = this.typeMap(typeRows);
    const inYear = (y: number) =>
      rows.filter((h) => h.date.startsWith(`${y}-`));
    const today = localDate(now);
    const nextYear = Number(today.slice(0, 4)) + 1;
    return {
      year,
      holidays: inYear(year)
        .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
        .map((h) => this.toPublic(h, types)),
      types: (['poya', 'public', 'weekly', 'closure'] as const).map((t) => ({
        type: t,
        ...types[t],
      })),
      weeklyRules: weekly
        .sort(
          (a, b) =>
            a.category.localeCompare(b.category) ||
            a.effectiveFrom.localeCompare(b.effectiveFrom),
        )
        .map((w) => ({
          id: w.id,
          category: w.category,
          weekdays: w.weekdays.map(Number),
          halfDayWeekday: w.halfDayWeekday,
          effectiveFrom: w.effectiveFrom,
          createdBy: w.createdBy,
        })),
      restDays: rest
        .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
        .map((r) => ({
          id: r.id,
          employeeId: fmtEmp(r.employeeId),
          employeeName:
            employees.find((e) => e.id === r.employeeId)?.name ?? 'Unknown',
          weekday: r.weekday,
          effectiveFrom: r.effectiveFrom,
        })),
      // December: warn when next year's Poya / public holidays aren't in yet
      nextYearMissing:
        today.slice(5, 7) === '12' &&
        !inYear(nextYear).some((h) => h.type !== 'closure' && !h.cancelledAt),
      nextYear,
    };
  }

  /** Last year's Poya / public holiday names as a template — dates blank, to fill in. */
  async template(fromYear: number) {
    return (await this.holidays.find())
      .filter(
        (h) =>
          h.date.startsWith(`${fromYear}-`) &&
          h.type !== 'closure' &&
          !h.cancelledAt,
      )
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((h) => ({ name: h.name, type: h.type, lastDate: h.date }));
  }

  // ── Poya / public holidays ──────────────────────────────────────────────

  async create(dto: HolidayDto, actor: HolidayActor): Promise<PublicHoliday> {
    await this.requireEdit(actor);
    const saved = await this.holidays.save(
      this.holidays.create({
        date: dto.date,
        name: dto.name.trim(),
        type: dto.type,
        paid: dto.paid ?? null,
        workAllowed: dto.workAllowed ?? null,
        appliesTo: 'all',
        collectionStops: false,
        declareGroup: null,
        reason: null,
        createdBy: actor.name,
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
      }),
    );
    await this.audit.record(actor, {
      action: `Added ${dto.type === 'poya' ? 'Poya day' : 'public holiday'}`,
      module: 'Holidays',
      record: `${saved.name} · ${saved.date}`,
      recordHref: '/admin/holidays',
    });
    return this.toPublic(saved, this.typeMap(await this.types.find()));
  }

  async update(
    id: number,
    dto: HolidayDto,
    actor: HolidayActor,
  ): Promise<PublicHoliday> {
    await this.requireEdit(actor);
    const h = await this.holidays.findOne({ where: { id } });
    if (!h || h.cancelledAt) throw new NotFoundException(`No holiday ${id}.`);
    if (h.type === 'closure') {
      throw new BadRequestException(
        'A declared holiday is changed by cancelling it and declaring again.',
      );
    }
    const before = `${h.name} · ${h.date}`;
    Object.assign(h, {
      date: dto.date,
      name: dto.name.trim(),
      type: dto.type,
      paid: dto.paid ?? null,
      workAllowed: dto.workAllowed ?? null,
    });
    const saved = await this.holidays.save(h);
    await this.audit.record(actor, {
      action: 'Changed a holiday',
      module: 'Holidays',
      record: `${saved.name} · ${saved.date}`,
      recordHref: '/admin/holidays',
      details: `was ${before}`,
    });
    return this.toPublic(saved, this.typeMap(await this.types.find()));
  }

  /** Cancel one Poya / public holiday (a declared closure is cancelled as a group). */
  async cancel(
    id: number,
    reason: string | undefined,
    actor: HolidayActor,
    now: Date = new Date(),
  ): Promise<void> {
    await this.requireEdit(actor);
    const h = await this.holidays.findOne({ where: { id } });
    if (!h || h.cancelledAt) throw new NotFoundException(`No holiday ${id}.`);
    if (h.declareGroup) {
      return this.cancelDeclared(h.declareGroup, reason, actor, now);
    }
    const why = this.reasonIfPast(h.date, reason, now);
    Object.assign(h, {
      cancelledAt: now,
      cancelledBy: actor.name,
      cancelReason: why,
    });
    await this.holidays.save(h);
    await this.audit.record(actor, {
      action: 'Cancelled a holiday',
      module: 'Holidays',
      record: `${h.name} · ${h.date}`,
      recordHref: '/admin/holidays',
      details: why ?? undefined,
    });
  }

  // ── types, weekly holiday, rest days ───────────────────────────────────────

  async updateType(
    type: HolidayTypeEntity['type'],
    dto: HolidayTypeDto,
    actor: HolidayActor,
  ): Promise<void> {
    await this.requireEdit(actor);
    const row =
      (await this.types.findOne({ where: { type } })) ??
      this.types.create({ type, label: DEFAULT_TYPES[type].label });
    const before = `paid ${row.paid ?? '—'}, work ${row.workAllowed ?? '—'}`;
    Object.assign(row, {
      paid: dto.paid,
      workAllowed: dto.workAllowed,
      updatedBy: actor.name,
      updatedAt: new Date(),
    });
    await this.types.save(row);
    await this.audit.record(actor, {
      action: `Changed holiday type "${row.label}"`,
      module: 'Holidays',
      record: row.label,
      recordHref: '/admin/holidays',
      details: `${before} → paid ${dto.paid}, work ${dto.workAllowed}`,
    });
  }

  /** A new weekly holiday for a category — from `effectiveFrom` on; past weeks keep theirs. */
  async setWeeklyRule(
    dto: WeeklyRuleDto,
    actor: HolidayActor,
    now: Date = new Date(),
  ): Promise<void> {
    await this.requireEdit(actor);
    this.assertNotPast(dto.effectiveFrom, now);
    const half = dto.halfDayWeekday ?? null;
    if (half !== null && dto.weekdays.includes(half)) {
      throw new BadRequestException(
        'The half day can’t also be a weekly holiday.',
      );
    }
    await this.weekly.save(
      this.weekly.create({
        category: dto.category,
        weekdays: [...new Set(dto.weekdays)].sort(),
        halfDayWeekday: half,
        effectiveFrom: dto.effectiveFrom,
        createdBy: actor.name,
      }),
    );
    await this.audit.record(actor, {
      action: 'Changed the weekly holiday',
      module: 'Holidays',
      record: dto.category === 'office' ? 'Office staff' : 'Factory workers',
      recordHref: '/admin/holidays',
      details: `${dayNames(dto.weekdays)}${half !== null ? `, half day ${dayNames([half])}` : ''} from ${dto.effectiveFrom}`,
    });
  }

  async setRestDay(
    employeeId: number,
    dto: RestDayDto,
    actor: HolidayActor,
    now: Date = new Date(),
  ): Promise<void> {
    await this.requireEdit(actor);
    this.assertNotPast(dto.effectiveFrom, now);
    const employee = await this.employees.findOne({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException(`No employee ${employeeId}.`);
    const weekday = dto.weekday ?? null;
    await this.restDays.save(
      this.restDays.create({
        employeeId,
        weekday,
        effectiveFrom: dto.effectiveFrom,
        createdBy: actor.name,
      }),
    );
    await this.audit.record(actor, {
      action: 'Changed a rest day',
      module: 'Holidays',
      record: employee.name,
      recordHref: `/employees/${fmtEmp(employeeId)}`,
      details: `${weekday === null ? 'category weekly holiday' : dayNames([weekday])} from ${dto.effectiveFrom}`,
    });
  }

  // ── Declare holiday (sudden closures) ──────────────────────────────────────

  /** What declaring would touch — shown to the Manager before they confirm. */
  async declarePreview(dto: DeclareHolidayDto): Promise<DeclarePreview> {
    const dates = this.rangeOf(dto);
    const [marked, employees, routes] = await Promise.all([
      this.attendance.find(),
      this.employees.find(),
      this.routes.find(),
    ]);
    const applies = (e: EmployeeEntity | undefined) =>
      !!e && (dto.appliesTo === 'all' || e.category === dto.appliesTo);
    const routeDays: DeclarePreview['routeDays'] = [];
    if (dto.collectionStops) {
      for (const date of dates) {
        for (const routeId of await this.schedule.scheduledRoutesOn(date)) {
          routeDays.push({
            routeId,
            routeName:
              routes.find((r) => r.id === routeId)?.name ?? `Route ${routeId}`,
            date,
          });
        }
      }
    }
    return {
      dates,
      attendance: marked
        .filter((a) => dates.includes(a.date))
        .map((a) => ({ a, e: employees.find((x) => x.id === a.employeeId) }))
        .filter(({ e }) => applies(e))
        .map(({ a, e }) => ({
          employeeId: fmtEmp(a.employeeId),
          name: e!.name,
          date: a.date,
          status: a.status,
        }))
        .sort(
          (x, y) =>
            x.date.localeCompare(y.date) || x.name.localeCompare(y.name),
        ),
      routeDays,
    };
  }

  async declare(
    dto: DeclareHolidayDto,
    actor: HolidayActor,
    now: Date = new Date(),
  ): Promise<{ group: string; preview: DeclarePreview }> {
    await this.requireEdit(actor);
    const preview = await this.declarePreview(dto);
    if (preview.attendance.length > 0 && !dto.attendance) {
      throw new ConflictException(
        'Attendance is already marked on those dates — choose to keep it as "Worked on holiday" or clear it.',
      );
    }
    const group = randomUUID();
    for (const date of preview.dates) {
      await this.holidays.save(
        this.holidays.create({
          date,
          name: dto.name.trim(),
          type: 'closure',
          paid: dto.paid,
          workAllowed: !dto.collectionStops || dto.appliesTo === 'office',
          appliesTo: dto.appliesTo,
          collectionStops: dto.collectionStops,
          declareGroup: group,
          reason: dto.reason.trim(),
          createdBy: actor.name,
          cancelledAt: null,
          cancelledBy: null,
          cancelReason: null,
        }),
      );
    }

    // Attendance already marked those days: keep → "Worked on holiday"; clear → removed.
    // An Absent can't stand on a holiday, so it is always cleared.
    const marked = (await this.attendance.find()).filter((a) =>
      preview.attendance.some(
        (p) => p.date === a.date && p.employeeId === fmtEmp(a.employeeId),
      ),
    );
    for (const a of marked) {
      if (
        dto.attendance === 'keep' &&
        a.status !== 'Absent' &&
        a.status !== 'Leave'
      ) {
        a.holidayWorked = true;
        a.editReason = `Declared holiday "${dto.name.trim()}" — kept as worked on holiday`;
        await this.attendance.save(a);
      } else if (!a.leaveRequestId) {
        await this.attendance.delete({ id: a.id });
      }
    }

    // Collection stops: cancel the routes for those days; deliveries move to the next collection day.
    const tag = `${CANCEL_TAG} ${dto.name.trim()} [${group}]`;
    const today = localDate(now);
    let cancelled = 0;
    for (const d of preview.routeDays) {
      if (d.date < today) continue;
      await this.schedule.addOverride(
        d.routeId,
        { date: d.date, kind: 'CANCEL', reason: tag },
        actor,
        now,
      );
      cancelled += 1;
      const agent = await this.resolver.getAgentForRoute(d.routeId, d.date);
      if (agent) {
        await this.notifier.notifyAgent(agent.agentId, {
          type: 'holiday_declared',
          title: `No collection on ${d.date}`,
          body: `${dto.name.trim()} — ${d.routeName} is not collected on ${d.date}.`,
        });
      }
    }
    if (cancelled > 0) await this.deliveries.reconcile(now);

    await this.audit.record(actor, {
      action: 'Declared a holiday',
      module: 'Holidays',
      record: `${dto.name.trim()} · ${preview.dates[0]}${preview.dates.length > 1 ? ` – ${preview.dates.at(-1)}` : ''}`,
      recordHref: '/admin/holidays',
      details:
        `${dto.reason.trim()} · ${dto.paid ? 'paid' : 'unpaid'} · ${dto.appliesTo}` +
        (dto.collectionStops
          ? ` · ${cancelled} route day(s) cancelled`
          : ' · collection continues') +
        (marked.length
          ? ` · ${marked.length} attendance record(s) ${dto.attendance === 'keep' ? 'kept' : 'cleared'}`
          : ''),
    });
    return { group, preview };
  }

  /** Before the date: reverses the declaration. After it: only with a reason. */
  async cancelDeclared(
    group: string,
    reason: string | undefined,
    actor: HolidayActor,
    now: Date = new Date(),
  ): Promise<void> {
    await this.requireEdit(actor);
    const rows = (await this.holidays.find()).filter(
      (h) => h.declareGroup === group && !h.cancelledAt,
    );
    if (rows.length === 0)
      throw new NotFoundException('No such declared holiday.');
    const first = rows.map((r) => r.date).sort()[0];
    const why = this.reasonIfPast(first, reason, now);
    for (const h of rows) {
      Object.assign(h, {
        cancelledAt: now,
        cancelledBy: actor.name,
        cancelReason: why,
      });
      await this.holidays.save(h);
    }
    // put back the route days it cancelled (only those still ahead)
    const today = localDate(now);
    const mine = (await this.overrides.find()).filter(
      (o) =>
        o.kind === 'CANCEL' &&
        o.reason?.includes(`[${group}]`) &&
        o.date >= today,
    );
    for (const o of mine) {
      await this.schedule.removeOverride(o.routeId, o.id, actor, now);
    }
    await this.audit.record(actor, {
      action: 'Cancelled a declared holiday',
      module: 'Holidays',
      record: `${rows[0].name} · ${first}`,
      recordHref: '/admin/holidays',
      details:
        (why ? `${why} · ` : '') + `${mine.length} route day(s) restored`,
    });
  }

  /** The day type of `date` for one employee (attendance, leave and payroll use this). */
  async dayFor(
    date: string,
    employee: { id: number; category: 'factory' | 'office' },
  ) {
    return dayInfo(date, employee, await this.facts(date, date));
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private async requireEdit(actor: HolidayActor): Promise<void> {
    await this.access.require(
      actor.role,
      'edit',
      'change the holiday calendar',
      'holidayCalendar',
    );
  }

  private typeMap(rows: HolidayTypeEntity[]): CalendarFacts['types'] {
    const out = { ...DEFAULT_TYPES };
    for (const r of rows) {
      out[r.type] = {
        label: r.label,
        paid: r.paid,
        workAllowed: r.workAllowed,
      };
    }
    return out;
  }

  private toPublic(
    h: HolidayEntity,
    types: CalendarFacts['types'],
  ): PublicHoliday {
    return {
      id: h.id,
      date: h.date,
      name: h.name,
      type: h.type,
      paid: h.paid ?? types[h.type].paid,
      workAllowed: h.workAllowed ?? types[h.type].workAllowed,
      appliesTo: h.appliesTo,
      collectionStops: h.collectionStops,
      declareGroup: h.declareGroup,
      reason: h.reason,
      createdBy: h.createdBy,
      cancelled: !!h.cancelledAt,
      cancelReason: h.cancelReason,
    };
  }

  private rangeOf(dto: { from: string; to: string }): string[] {
    if (dto.to < dto.from) {
      throw new BadRequestException('The end date is before the start date.');
    }
    const dates = datesBetween(dto.from, dto.to);
    if (dates.length > 31) {
      throw new BadRequestException('Declare at most 31 days at a time.');
    }
    return dates;
  }

  private assertNotPast(date: string, now: Date): void {
    if (date < localDate(now)) {
      throw new BadRequestException(
        'Changes apply from today or later — past weeks keep their holidays.',
      );
    }
  }

  /** On or before the date: no reason needed. After it: a reason is required. */
  private reasonIfPast(
    date: string,
    reason: string | undefined,
    now: Date,
  ): string | null {
    const why = reason?.trim() || null;
    if (date <= localDate(now) && !why) {
      throw new BadRequestException(
        'This holiday has already started — a reason is required to cancel it.',
      );
    }
    return why;
  }
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
function dayNames(days: number[]): string {
  return days.length ? days.map((d) => DAY_NAMES[d]).join(', ') : 'none';
}
