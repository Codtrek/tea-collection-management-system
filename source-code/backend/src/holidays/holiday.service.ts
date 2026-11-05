import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { SystemSettingEntity } from '../admin/system-setting.entity';
import { AuditService } from '../audit/audit.service';
import type { AppRole } from '../auth/role-map';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { localDate } from '../dispatch/dispatch-map';
import { DispatchNotifier } from '../dispatch/dispatch-notifier.service';
import type { NotifyInput } from '../dispatch/dispatch-notifier.service';
import { RouteResolverService } from '../dispatch/route-resolver.service';
import { RouteScheduleOverrideEntity } from '../dispatch/route-schedule.entity';
import { RouteScheduleService } from '../dispatch/route-schedule.service';
import { EmployeeAttendanceEntity } from '../employees/employee-attendance.entity';
import { EmployeeEntity } from '../employees/employee.entity';
import { PayrollRunEntity } from '../employees/payroll-run.entity';
import { RouteEntity } from '../estates/route.entity';
import { FertilizerDeliveryService } from '../fertilizer/fertilizer-delivery.service';
import { keyToLabel } from '../reports/reports-map';
import { User } from '../users/user.entity';
import type {
  DeclareHolidayDto,
  HolidayDto,
  HolidayTypeDto,
  RestDayDto,
  WeeklyRuleDto,
} from './dto/holiday.dto';
import { EmployeeRestDayEntity } from './employee-rest-day.entity';
import {
  allowed,
  type ChangeContext,
  decide,
  type HolidayAction,
  type HolidayLevels,
  type Outcome,
} from './holiday-permissions';
import {
  type AttendanceSnapshot,
  HolidayRequestEntity,
} from './holiday-request.entity';
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
  createdAt: string | null;
  source: HolidayEntity['source'];
  importedAt: string | null;
  cancelled: boolean;
  cancelReason: string | null;
  /** may the person asking change / cancel it (server-decided; the portal only shows the button) */
  canChange: boolean;
}

export interface PublicHolidayRequest {
  id: number;
  kind: HolidayRequestEntity['kind'];
  status: HolidayRequestEntity['status'];
  name: string;
  dateFrom: string;
  dateTo: string;
  appliesTo: 'all' | 'factory' | 'office' | null;
  /** one line for the panel, e.g. "Factory workers: Sunday, Saturday from 2026-12-01" */
  summary: string;
  reason: string | null;
  requestedBy: string;
  requestedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
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

/** applied = in force now · pending = waiting for the Administrator · review = in force, Administrator reviews after */
export type ChangeResult =
  | { status: 'applied' }
  | { status: 'pending'; requestId: number }
  | { status: 'review'; requestId: number };

const CANCEL_TAG = 'Holiday:';
const fmtEmp = (id: number) => `EMP-${String(id).padStart(4, '0')}`;
const CATEGORY_LABEL = { factory: 'Factory workers', office: 'Office staff' };
const APPLIES_LABEL = { all: 'All employees', ...CATEGORY_LABEL };

/**
 * The holiday calendar (Attendance-Leave-Addendum §4): Poya / public holidays per year, the
 * per-type paid / work-allowed defaults, the weekly holiday per category (effective-from),
 * per-employee rest days, "Declare holiday" for closures, and the Administrator's approvals.
 * Every write asks `decide()` (holiday-permissions.ts — the data-driven matrix) and is audited.
 * A pending request is stored in `holiday_requests` only, so `facts()` — what attendance, leave
 * and payroll read (working-days.ts) — never sees it until it is approved.
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
    @InjectRepository(HolidayRequestEntity)
    private readonly requests: Repository<HolidayRequestEntity>,
    @InjectRepository(PayrollRunEntity)
    private readonly payroll: Repository<PayrollRunEntity>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(SystemSettingEntity)
    private readonly settings: Repository<SystemSettingEntity>,
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

  /** The calendar's first weekday (0 = Sunday, 1 = Monday) — `system_settings.holidays.weekStartsOn`. */
  async weekStartsOn(): Promise<0 | 1> {
    const row = await this.settings.findOne({ where: { key: 'holidays' } });
    const v = (row?.value as { weekStartsOn?: unknown } | undefined)
      ?.weekStartsOn;
    return v === 0 ? 0 : 1;
  }

  async setWeekStartsOn(day: 0 | 1, actor: HolidayActor): Promise<void> {
    await this.gate(actor, 'types');
    const row =
      (await this.settings.findOne({ where: { key: 'holidays' } })) ??
      this.settings.create({ key: 'holidays', value: {} });
    row.value = { ...(row.value as object), weekStartsOn: day };
    Object.assign(row, { updatedBy: actor.name, updatedAt: new Date() });
    await this.settings.save(row);
    await this.audit.record(actor, {
      action: 'Changed the calendar week start',
      module: 'Holidays',
      record: 'Holiday calendar',
      recordHref: '/holidays',
      details: `Week starts on ${DAY_NAMES[day]}`,
    });
  }

  /**
   * The day drawer: that day's holidays (with who / where from), requests awaiting approval,
   * the day type per category, and what a change would touch — attendance already marked,
   * routes scheduled, approved leave (null until leave requests exist, Phase 2).
   */
  async day(date: string, actor: HolidayActor, now: Date = new Date()) {
    const [all, typeRows, pending, levels, employees, locks, marked, routes] =
      await Promise.all([
        this.holidays.find(),
        this.types.find(),
        this.requests.find({ where: { status: 'pending' } }),
        this.levels(actor),
        this.employees.find(),
        this.payrollLocks(),
        this.attendance.find({ where: { date } }),
        this.routes.find(),
      ]);
    const types = this.typeMap(typeRows);
    const facts = await this.facts(date, date);
    const scheduled = await this.schedule.scheduledRoutesOn(date);
    const names = marked
      .map((a) => employees.find((e) => e.id === a.employeeId)?.name)
      .filter((n): n is string => !!n)
      .sort();
    return {
      date,
      holidays: all
        .filter((h) => h.date === date)
        .sort(
          (a, b) =>
            Number(!!a.cancelledAt) - Number(!!b.cancelledAt) || a.id - b.id,
        )
        .map((h) =>
          this.toPublic(
            h,
            types,
            allowed(
              this.changeOutcome(h, all, actor, levels, employees, locks, now),
            ),
          ),
        ),
      pending: pending
        .filter((r) => r.dateFrom <= date && r.dateTo >= date)
        .map((r) => this.toPublicRequest(r)),
      dayType: {
        factory: dayInfo(date, { id: 0, category: 'factory' }, facts),
        office: dayInfo(date, { id: 0, category: 'office' }, facts),
      },
      impact: {
        attendanceMarked: names.length,
        attendanceNames: names.slice(0, 12),
        routes: [...scheduled]
          .map((id) => ({
            id,
            name: routes.find((r) => r.id === id)?.name ?? `Route ${id}`,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        /** approved leave that day — leave requests arrive in Phase 2 */
        approvedLeave: null as number | null,
      },
    };
  }

  /** The calendar page: a year's holidays, pending requests, the type defaults, weekly rules, rest days. */
  async year(year: number, actor: HolidayActor, now: Date = new Date()) {
    const [
      rows,
      typeRows,
      weekly,
      rest,
      employees,
      pending,
      levels,
      locks,
      weekStartsOn,
    ] = await Promise.all([
      this.holidays.find(),
      this.types.find(),
      this.weekly.find(),
      this.restDays.find(),
      this.employees.find(),
      this.requests.find({ where: { status: 'pending' } }),
      this.levels(actor),
      this.payrollLocks(),
      this.weekStartsOn(),
    ]);
    const types = this.typeMap(typeRows);
    const inYear = (y: number) =>
      rows.filter((h) => h.date.startsWith(`${y}-`));
    const today = localDate(now);
    const nextYear = Number(today.slice(0, 4)) + 1;
    const live = inYear(year).filter((h) => !h.cancelledAt);
    return {
      year,
      weekStartsOn,
      holidays: inYear(year)
        .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
        .map((h) =>
          this.toPublic(
            h,
            types,
            allowed(
              this.changeOutcome(h, rows, actor, levels, employees, locks, now),
            ),
          ),
        ),
      counts: {
        poya: live.filter((h) => h.type === 'poya').length,
        public: live.filter((h) => h.type === 'public').length,
        closure: live.filter((h) => h.type === 'closure').length,
      },
      pending: pending
        .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom) || a.id - b.id)
        .map((r) => this.toPublicRequest(r)),
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

  /** Requests for the Administrator's panel (pending first, then the last decided ones). */
  async listRequests(): Promise<PublicHolidayRequest[]> {
    return (await this.requests.find())
      .sort(
        (a, b) =>
          Number(b.status === 'pending') - Number(a.status === 'pending') ||
          new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
      )
      .slice(0, 50)
      .map((r) => this.toPublicRequest(r));
  }

  // ── Poya / public holidays (holidayStatutory) ──────────────────────────────

  async create(dto: HolidayDto, actor: HolidayActor): Promise<PublicHoliday> {
    await this.gate(actor, 'statutory');
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
        createdByUserId: actor.sub ?? null,
        source: 'manual',
        externalUid: null,
        importedAt: null,
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
      }),
    );
    await this.audit.record(actor, {
      action: `Added ${dto.type === 'poya' ? 'Poya day' : 'public holiday'}`,
      module: 'Holidays',
      record: `${saved.name} · ${saved.date}`,
      recordHref: '/holidays',
    });
    return this.toPublic(saved, this.typeMap(await this.types.find()), true);
  }

  async update(
    id: number,
    dto: HolidayDto,
    actor: HolidayActor,
  ): Promise<PublicHoliday> {
    const h = await this.holidays.findOne({ where: { id } });
    if (!h || h.cancelledAt) throw new NotFoundException(`No holiday ${id}.`);
    if (h.type === 'closure') {
      throw new BadRequestException(
        'A declared holiday is changed by cancelling it and declaring again.',
      );
    }
    await this.gate(actor, 'statutory');
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
      recordHref: '/holidays',
      details: `was ${before}`,
    });
    return this.toPublic(saved, this.typeMap(await this.types.find()), true);
  }

  /** Cancel one Poya / public holiday (a declared closure is cancelled as a group). */
  async cancel(
    id: number,
    reason: string | undefined,
    actor: HolidayActor,
    now: Date = new Date(),
  ): Promise<void> {
    const h = await this.holidays.findOne({ where: { id } });
    if (!h || h.cancelledAt) throw new NotFoundException(`No holiday ${id}.`);
    if (h.declareGroup) {
      return this.cancelDeclared(h.declareGroup, reason, actor, now);
    }
    await this.gate(
      actor,
      h.type === 'closure' ? 'changeHoliday' : 'statutory',
    );
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
      recordHref: '/holidays',
      details: why ?? undefined,
    });
  }

  // ── types, weekly holiday, rest days ───────────────────────────────────────

  async updateType(
    type: HolidayTypeEntity['type'],
    dto: HolidayTypeDto,
    actor: HolidayActor,
  ): Promise<void> {
    await this.gate(actor, 'types');
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
      recordHref: '/holidays',
      details: `${before} → paid ${dto.paid}, work ${dto.workAllowed}`,
    });
  }

  /**
   * A new weekly holiday for a category — from `effectiveFrom` on; past weeks keep theirs.
   * The Administrator sets it; a Manager's change is a proposal until the Administrator approves.
   */
  async setWeeklyRule(
    dto: WeeklyRuleDto,
    actor: HolidayActor,
    now: Date = new Date(),
  ): Promise<ChangeResult> {
    const outcome = await this.gate(actor, 'weeklyRule');
    this.assertNotPast(dto.effectiveFrom, now);
    const half = dto.halfDayWeekday ?? null;
    if (half !== null && dto.weekdays.includes(half)) {
      throw new BadRequestException(
        'The half day can’t also be a weekly holiday.',
      );
    }
    if (outcome.kind === 'request') {
      const req = await this.openRequest(
        'weekly_rule',
        { ...dto, halfDayWeekday: half },
        dto.effectiveFrom,
        dto.effectiveFrom,
        actor,
        now,
      );
      await this.audit.record(actor, {
        action: 'Proposed a weekly holiday',
        module: 'Holidays',
        record: CATEGORY_LABEL[dto.category],
        recordHref: '/holidays',
        details: `${weeklyText(dto.weekdays, half)} from ${dto.effectiveFrom} — waiting for the Administrator`,
      });
      return { status: 'pending', requestId: req.id };
    }
    await this.writeWeekly(dto, actor.name, actor);
    return { status: 'applied' };
  }

  async setRestDay(
    employeeId: number,
    dto: RestDayDto,
    actor: HolidayActor,
    now: Date = new Date(),
  ): Promise<void> {
    await this.gate(actor, 'restDay');
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

  // ── Declare holiday (closures, category holidays) ──────────────────────────

  /** What declaring would touch — shown before confirming. */
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

  /**
   * Declare a holiday over a date or range.
   *   • Factory workers / Office staff only → a category holiday (Manager or Administrator).
   *   • All employees → a factory closure: the Administrator declares it; a Manager's is a request.
   *   • `emergency` (today only, all employees) → in force now; the Administrator reviews it after.
   */
  async declare(
    dto: DeclareHolidayDto,
    actor: HolidayActor,
    now: Date = new Date(),
  ): Promise<ChangeResult & { group?: string; preview: DeclarePreview }> {
    const action: HolidayAction =
      dto.appliesTo !== 'all'
        ? 'categoryHoliday'
        : dto.emergency
          ? 'emergencyClosure'
          : 'factoryClosure';
    const outcome = await this.gate(actor, action);
    const today = localDate(now);
    if (
      action === 'emergencyClosure' &&
      (dto.from !== today || dto.to !== today)
    ) {
      throw new BadRequestException('An emergency closure is for today only.');
    }
    const preview = await this.declarePreview(dto);
    if (preview.attendance.length > 0 && !dto.attendance) {
      throw new ConflictException(
        'Attendance is already marked on those dates — choose to keep it as "Worked on holiday" or clear it.',
      );
    }

    if (outcome.kind === 'request') {
      const req = await this.openRequest(
        'closure',
        { ...dto },
        preview.dates[0],
        preview.dates.at(-1)!,
        actor,
        now,
      );
      await this.audit.record(actor, {
        action: 'Requested a factory closure',
        module: 'Holidays',
        record: `${dto.name.trim()} · ${rangeText(preview.dates)}`,
        recordHref: '/holidays',
        details: `${dto.reason.trim()} — waiting for the Administrator`,
      });
      return { status: 'pending', requestId: req.id, preview };
    }

    const { group, snapshot } = await this.applyDeclare(
      dto,
      preview,
      actor,
      { name: actor.name, userId: actor.sub ?? null },
      now,
    );
    if (outcome.kind === 'review') {
      const req = await this.openRequest(
        'emergency',
        { ...dto },
        today,
        today,
        actor,
        now,
        { declareGroup: group, snapshot },
      );
      return { status: 'review', requestId: req.id, group, preview };
    }
    return { status: 'applied', group, preview };
  }

  /** Before the date: reverses the declaration. After it: only with a reason. */
  async cancelDeclared(
    group: string,
    reason: string | undefined,
    actor: HolidayActor,
    now: Date = new Date(),
  ): Promise<void> {
    const all = await this.holidays.find();
    const rows = all.filter((h) => h.declareGroup === group && !h.cancelledAt);
    if (rows.length === 0)
      throw new NotFoundException('No such declared holiday.');
    const [levels, employees, locks] = await Promise.all([
      this.levels(actor),
      this.employees.find(),
      this.payrollLocks(),
    ]);
    this.orThrow(
      this.changeOutcome(rows[0], all, actor, levels, employees, locks, now),
    );
    const first = rows.map((r) => r.date).sort()[0];
    const why = this.reasonIfPast(first, reason, now);
    const restored = await this.undoGroup(rows, why, actor, now);
    // an emergency closure still waiting for review is settled by cancelling it
    const review = (await this.requests.find()).find(
      (r) => r.declareGroup === group && r.status === 'pending',
    );
    if (review) {
      Object.assign(review, {
        status: 'reverted',
        decidedBy: actor.name,
        decidedAt: now,
        decisionReason: why ?? 'Cancelled',
      });
      await this.requests.save(review);
    }
    await this.audit.record(actor, {
      action: 'Cancelled a declared holiday',
      module: 'Holidays',
      record: `${rows[0].name} · ${first}`,
      recordHref: '/holidays',
      details:
        (why ? `${why} · ` : '') + `${restored.length} route day(s) restored`,
    });
  }

  // ── the Administrator's decisions ─────────────────────────────────────────

  /**
   * Approve or reject a request (a reason is always required). For an emergency closure,
   * approve = keep it, reject = revert it: the holiday goes, the route days come back,
   * attendance is put back as it was and the agents are told collection is back on.
   */
  async decideRequest(
    id: number,
    decision: 'approve' | 'reject',
    reason: string,
    actor: HolidayActor,
    now: Date = new Date(),
  ): Promise<PublicHolidayRequest> {
    await this.gate(actor, 'approve');
    const why = reason?.trim();
    if (!why) throw new BadRequestException('A reason is required.');
    const req = await this.requests.findOne({ where: { id } });
    if (!req) throw new NotFoundException(`No holiday request ${id}.`);
    if (req.status !== 'pending') {
      throw new ConflictException('This request has already been decided.');
    }
    const requester = { name: req.requestedBy, userId: req.requestedByUserId };
    const today = localDate(now);
    let action: string;
    let note = '';

    if (req.kind === 'weekly_rule') {
      if (decision === 'approve') {
        const dto = req.payload as unknown as WeeklyRuleDto;
        const from = dto.effectiveFrom < today ? today : dto.effectiveFrom;
        if (from !== dto.effectiveFrom)
          note = ` · applies from ${from} (asked ${dto.effectiveFrom})`;
        await this.writeWeekly(
          { ...dto, effectiveFrom: from },
          requester.name,
          actor,
        );
      }
      req.status = decision === 'approve' ? 'approved' : 'rejected';
      action =
        decision === 'approve'
          ? 'Approved a weekly holiday'
          : 'Rejected a weekly holiday';
    } else if (req.kind === 'closure') {
      if (decision === 'approve') {
        const dto = req.payload as unknown as DeclareHolidayDto;
        if (req.dateTo < today) {
          throw new BadRequestException(
            'These dates have passed — reject the request instead.',
          );
        }
        const preview = await this.declarePreview(dto);
        const { group } = await this.applyDeclare(
          { ...dto, attendance: dto.attendance ?? 'keep' },
          preview,
          actor,
          requester,
          now,
        );
        req.declareGroup = group;
      }
      req.status = decision === 'approve' ? 'approved' : 'rejected';
      action =
        decision === 'approve'
          ? 'Approved a factory closure'
          : 'Rejected a factory closure';
    } else {
      if (decision === 'reject') {
        const rows = (await this.holidays.find()).filter(
          (h) => h.declareGroup === req.declareGroup && !h.cancelledAt,
        );
        const restored = await this.undoGroup(
          rows,
          `Reverted: ${why}`,
          actor,
          now,
        );
        await this.restoreAttendance(req.snapshot ?? []);
        for (const o of restored) {
          const agent = await this.resolver.getAgentForRoute(o.routeId, o.date);
          if (agent) {
            await this.notifier.notifyAgent(agent.agentId, {
              type: 'holiday_cancelled',
              title: `Collection is back on ${o.date}`,
              body: `${req.payload.name as string} was cancelled — your route is collected as usual.`,
            });
          }
        }
        if (restored.length > 0) await this.deliveries.reconcile(now);
        note = ` · ${restored.length} route day(s) restored, ${(req.snapshot ?? []).length} attendance record(s) put back`;
      }
      req.status = decision === 'approve' ? 'kept' : 'reverted';
      action =
        decision === 'approve'
          ? 'Kept an emergency closure'
          : 'Reverted an emergency closure';
    }

    Object.assign(req, {
      decidedBy: actor.name,
      decidedAt: now,
      decisionReason: why,
    });
    await this.requests.save(req);
    const pub = this.toPublicRequest(req);
    await this.audit.record(actor, {
      action,
      module: 'Holidays',
      record: `${pub.name} · ${rangeText([req.dateFrom, req.dateTo])}`,
      recordHref: '/holidays',
      details: `${why}${note} · requested by ${req.requestedBy}`,
    });
    if (requester.userId) {
      await this.notifier.notifyUser(requester.userId, {
        type: 'holiday_request',
        title: `${action} — ${pub.name}`,
        body: why,
        referenceId: req.id,
        referenceType: 'holiday_request',
      });
    }
    return pub;
  }

  /** The day type of `date` for one employee (attendance, leave and payroll use this). */
  async dayFor(
    date: string,
    employee: { id: number; category: 'factory' | 'office' },
  ) {
    return dayInfo(date, employee, await this.facts(date, date));
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private async levels(actor: HolidayActor): Promise<HolidayLevels> {
    const [calendar, statutory] = await Promise.all([
      this.access.levelFor(actor.role, 'holidayCalendar'),
      this.access.levelFor(actor.role, 'holidayStatutory'),
    ]);
    return { calendar, statutory };
  }

  /** The matrix's answer for this person and action — throws 403 on "deny". */
  private async gate(
    actor: HolidayActor,
    action: HolidayAction,
    ctx?: ChangeContext,
  ): Promise<Outcome> {
    return this.orThrow(decide(action, await this.levels(actor), ctx));
  }

  private orThrow(outcome: Outcome): Outcome {
    if (outcome.kind === 'deny') throw new ForbiddenException(outcome.message);
    return outcome;
  }

  /** May `actor` change / cancel holiday `h`? Poya / public → holidayStatutory; closures → the Manager limits. */
  private changeOutcome(
    h: HolidayEntity,
    all: HolidayEntity[],
    actor: HolidayActor,
    levels: HolidayLevels,
    employees: EmployeeEntity[],
    locks: Set<string>,
    now: Date,
  ): Outcome {
    if (h.cancelledAt) return { kind: 'deny', message: 'Already cancelled.' };
    if (h.type !== 'closure') return decide('statutory', levels);
    const dates = h.declareGroup
      ? all
          .filter((x) => x.declareGroup === h.declareGroup && !x.cancelledAt)
          .map((x) => x.date)
      : [h.date];
    const today = localDate(now);
    const covered = employees.filter(
      (e) => h.appliesTo === 'all' || e.category === h.appliesTo,
    );
    return decide('changeHoliday', levels, {
      own: h.createdByUserId != null && h.createdByUserId === actor.sub,
      future: dates.every((d) => d > today),
      payrollProcessed: dates.some((d) =>
        covered.some((e) => locks.has(`${e.id}:${keyToLabel(d.slice(0, 7))}`)),
      ),
      appliesTo: h.appliesTo,
    });
  }

  /** "employeeId:Month YYYY" for every Processed payroll row. */
  private async payrollLocks(): Promise<Set<string>> {
    return new Set(
      (await this.payroll.find())
        .filter((p) => p.status === 'Processed')
        .map((p) => `${p.employeeId}:${p.period}`),
    );
  }

  private async writeWeekly(
    dto: WeeklyRuleDto,
    createdBy: string,
    actor: HolidayActor,
  ): Promise<void> {
    const half = dto.halfDayWeekday ?? null;
    await this.weekly.save(
      this.weekly.create({
        category: dto.category,
        weekdays: [...new Set(dto.weekdays)].sort(),
        halfDayWeekday: half,
        effectiveFrom: dto.effectiveFrom,
        createdBy,
      }),
    );
    await this.audit.record(actor, {
      action: 'Changed the weekly holiday',
      module: 'Holidays',
      record: CATEGORY_LABEL[dto.category],
      recordHref: '/holidays',
      details: `${weeklyText(dto.weekdays, half)} from ${dto.effectiveFrom}`,
    });
  }

  /** Writes the closure rows, settles attendance, cancels routes; returns what attendance looked like before. */
  private async applyDeclare(
    dto: DeclareHolidayDto,
    preview: DeclarePreview,
    actor: HolidayActor,
    creator: { name: string; userId: number | null },
    now: Date,
  ): Promise<{ group: string; snapshot: AttendanceSnapshot[] }> {
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
          createdBy: creator.name,
          createdByUserId: creator.userId,
          source: 'manual',
          externalUid: null,
          importedAt: null,
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
    const snapshot = marked.map((a) => ({ ...a }));
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
      action: dto.emergency
        ? 'Declared an emergency closure'
        : 'Declared a holiday',
      module: 'Holidays',
      record: `${dto.name.trim()} · ${rangeText(preview.dates)}`,
      recordHref: '/holidays',
      details:
        `${dto.reason.trim()} · ${dto.paid ? 'paid' : 'unpaid'} · ${APPLIES_LABEL[dto.appliesTo]}` +
        (dto.collectionStops
          ? ` · ${cancelled} route day(s) cancelled`
          : ' · collection continues') +
        (marked.length
          ? ` · ${marked.length} attendance record(s) ${dto.attendance === 'keep' ? 'kept' : 'cleared'}`
          : '') +
        (creator.name !== actor.name ? ` · requested by ${creator.name}` : ''),
    });
    return { group, snapshot };
  }

  /** Cancels a declared group's rows and gives back the route days still ahead. */
  private async undoGroup(
    rows: HolidayEntity[],
    why: string | null,
    actor: HolidayActor,
    now: Date,
  ): Promise<RouteScheduleOverrideEntity[]> {
    const group = rows[0]?.declareGroup;
    for (const h of rows) {
      Object.assign(h, {
        cancelledAt: now,
        cancelledBy: actor.name,
        cancelReason: why,
      });
      await this.holidays.save(h);
    }
    if (!group) return [];
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
    return mine;
  }

  /** Puts attendance back as it was before an emergency closure (revert). */
  private async restoreAttendance(
    snapshot: AttendanceSnapshot[],
  ): Promise<void> {
    for (const s of snapshot) {
      const row = await this.attendance.findOne({ where: { id: s.id } });
      if (row) {
        row.holidayWorked = s.holidayWorked;
        row.editReason = s.editReason;
        await this.attendance.save(row);
      } else {
        await this.attendance.save(
          this.attendance.create(s as unknown as EmployeeAttendanceEntity),
        );
      }
    }
  }

  private async openRequest(
    kind: HolidayRequestEntity['kind'],
    payload: object,
    dateFrom: string,
    dateTo: string,
    actor: HolidayActor,
    now: Date,
    extra: Partial<HolidayRequestEntity> = {},
  ): Promise<HolidayRequestEntity> {
    const req = await this.requests.save(
      this.requests.create({
        kind,
        status: 'pending',
        payload: payload as Record<string, unknown>,
        dateFrom,
        dateTo,
        requestedBy: actor.name,
        requestedByUserId: actor.sub ?? null,
        requestedAt: now,
        decidedBy: null,
        decidedAt: null,
        decisionReason: null,
        declareGroup: null,
        snapshot: null,
        ...extra,
      }),
    );
    const pub = this.toPublicRequest(req);
    await this.notifyAdmins({
      type: 'holiday_request',
      title:
        kind === 'emergency'
          ? `Emergency closure to review — ${pub.name}`
          : `Holiday request to approve — ${pub.name}`,
      body: `${pub.summary} · requested by ${actor.name}`,
      referenceId: req.id,
      referenceType: 'holiday_request',
    });
    return req;
  }

  private async notifyAdmins(input: NotifyInput): Promise<void> {
    const admins = (await this.users.find()).filter(
      (u) => u.role === 'factory_admin' && u.status === 'active',
    );
    for (const a of admins) await this.notifier.notifyUser(a.id, input);
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
    canChange: boolean,
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
      createdAt: h.createdAt ? new Date(h.createdAt).toISOString() : null,
      source: h.source ?? 'manual',
      importedAt: h.importedAt ? new Date(h.importedAt).toISOString() : null,
      cancelled: !!h.cancelledAt,
      cancelReason: h.cancelReason,
      canChange,
    };
  }

  private toPublicRequest(r: HolidayRequestEntity): PublicHolidayRequest {
    const p = r.payload;
    const iso = (d: Date | string | null) =>
      d ? new Date(d).toISOString() : null;
    let name: string;
    let summary: string;
    let appliesTo: PublicHolidayRequest['appliesTo'] = null;
    if (r.kind === 'weekly_rule') {
      const w = p as unknown as WeeklyRuleDto;
      name = `Weekly holiday — ${CATEGORY_LABEL[w.category]}`;
      summary = `${CATEGORY_LABEL[w.category]}: ${weeklyText(w.weekdays, w.halfDayWeekday ?? null)} from ${w.effectiveFrom}`;
      appliesTo = w.category;
    } else {
      const d = p as unknown as DeclareHolidayDto;
      name = d.name;
      appliesTo = d.appliesTo;
      summary =
        `${APPLIES_LABEL[d.appliesTo]} · ${rangeText([r.dateFrom, r.dateTo])} · ${d.paid ? 'paid' : 'unpaid'} · ` +
        (d.collectionStops ? 'collection stops' : 'collection continues');
    }
    return {
      id: r.id,
      kind: r.kind,
      status: r.status,
      name,
      dateFrom: r.dateFrom,
      dateTo: r.dateTo,
      appliesTo,
      summary,
      reason: r.kind === 'weekly_rule' ? null : ((p.reason as string) ?? null),
      requestedBy: r.requestedBy,
      requestedAt: iso(r.requestedAt)!,
      decidedBy: r.decidedBy,
      decidedAt: iso(r.decidedAt),
      decisionReason: r.decisionReason,
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
function weeklyText(days: number[], half: number | null): string {
  return `${dayNames(days)}${half !== null ? `, half day ${dayNames([half])}` : ''}`;
}
function rangeText(dates: string[]): string {
  const first = dates[0];
  const last = dates.at(-1);
  return last && last !== first ? `${first} – ${last}` : first;
}
