import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSettingEntity } from '../admin/system-setting.entity';
import { AuditService } from '../audit/audit.service';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { localDate } from '../dispatch/dispatch-map';
import { DispatchService } from '../dispatch/dispatch.service';
import { HolidayService } from '../holidays/holiday.service';
import {
  type CalendarFacts,
  datesOfMonth,
  type DayInfo,
  dayInfo,
} from '../holidays/working-days';
import { keyToLabel } from '../reports/reports-map';
import {
  type AttendanceCode,
  codeOf,
  daysBack,
  editWindowError,
  type MonthTotals,
  monthTotals,
  resolveAttendance,
} from './attendance-rules';
import type { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { EmployeeAttendanceEntity } from './employee-attendance.entity';
import {
  type DbAttendanceStatus,
  formatEmployeeId,
  parseEmployeeId,
} from './employee-map';
import { EmployeeRoutesService } from './employee-routes.service';
import { EmployeeEntity } from './employee.entity';
import type { Actor } from './employees.service';
import { PayrollRunEntity } from './payroll-run.entity';

export interface AttendanceCell {
  date: string;
  code: AttendanceCode | null;
  status: DbAttendanceStatus | null;
  /** "Half-day (AM)", "Short leave 10:00–11:15", "Il Full Moon Poya" … */
  tooltip: string;
  dayType: DayInfo['type'];
  dayLabel: string | null;
  future: boolean;
  /** why it can't be changed here (payroll processed / approved leave) */
  lockedReason: string | null;
}

export interface AttendanceMonthRow {
  employeeId: string;
  name: string;
  role: string;
  category: 'factory' | 'office';
  routes: { id: number; name: string }[];
  cells: AttendanceCell[];
  totals: MonthTotals;
}

export interface AttendanceMonth {
  month: string;
  today: string;
  /** the header: the factory-wide day type of each date (category 'factory') */
  days: {
    date: string;
    dayType: DayInfo['type'];
    label: string | null;
    today: boolean;
    future: boolean;
  }[];
  rows: AttendanceMonthRow[];
  roles: string[];
  routes: { id: number; name: string }[];
}

export interface AttendanceDayRow {
  employeeId: string;
  name: string;
  role: string;
  routes: { id: number; name: string }[];
  status: DbAttendanceStatus | null;
  code: AttendanceCode | null;
  half: 'AM' | 'PM' | null;
  shortOut: string | null;
  shortBack: string | null;
  holidayWorked: boolean;
  markedBy: string | null;
  markedAt: string | null;
  source: EmployeeAttendanceEntity['source'] | null;
  dayType: DayInfo['type'];
  dayLabel: string | null;
  workAllowed: boolean;
  lockedReason: string | null;
}

export interface AttendanceDay {
  date: string;
  today: string;
  editWindowDays: number;
  /** this date is outside the Officer's window — a Manager + reason only */
  needsReason: boolean;
  rows: AttendanceDayRow[];
  summary: {
    present: number;
    absent: number;
    onLeave: number;
    notMarked: number;
  };
}

interface MonthFilters {
  search?: string;
  role?: string;
  routeId?: number;
  unmarked?: boolean;
  employeeId?: string;
}

const isActiveOn = (e: EmployeeEntity, date: string) =>
  e.status === 'Active' || (!!e.deactivatedOn && e.deactivatedOn >= date);

/**
 * Attendance (Attendance-Leave-Addendum Phase 1): the month grid, the day view, the daily entry
 * and marking itself — with the rules in attendance-rules.ts, the holiday calendar's day types
 * (HolidayService / working-days.ts), and one record shared with Agent Dispatch.
 */
@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(EmployeeAttendanceEntity)
    private readonly attendance: Repository<EmployeeAttendanceEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly employees: Repository<EmployeeEntity>,
    @InjectRepository(PayrollRunEntity)
    private readonly payroll: Repository<PayrollRunEntity>,
    @InjectRepository(SystemSettingEntity)
    private readonly settings: Repository<SystemSettingEntity>,
    private readonly holidays: HolidayService,
    private readonly dispatch: DispatchService,
    private readonly employeeRoutes: EmployeeRoutesService,
    private readonly access: DispatchAccessService,
    private readonly audit: AuditService,
  ) {}

  async editWindowDays(): Promise<number> {
    const row = await this.settings.findOne({ where: { key: 'attendance' } });
    const n = (row?.value as { editWindowDays?: unknown } | undefined)
      ?.editWindowDays;
    return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 60
      ? n
      : 3;
  }

  // ── views ───────────────────────────────────────────────────────────────

  async month(
    month: string,
    f: MonthFilters = {},
    now: Date = new Date(),
  ): Promise<AttendanceMonth> {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new BadRequestException('month must be YYYY-MM.');
    }
    const today = localDate(now);
    const dates = datesOfMonth(month);
    const [employees, rows, facts, routesByEmployee, routes, locks] =
      await Promise.all([
        this.employees.find(),
        this.attendance.find(),
        this.holidays.facts(dates[0], dates.at(-1)!),
        this.employeeRoutes.routesByEmployee(),
        this.employeeRoutes.routes(),
        this.payrollLocks(),
      ]);
    const inMonth = rows.filter((r) => r.date.startsWith(`${month}-`));
    const people = employees.filter(
      (e) =>
        isActiveOn(e, dates[0]) || inMonth.some((r) => r.employeeId === e.id),
    );
    const needle = f.search?.trim().toLowerCase() ?? '';
    const onlyId = f.employeeId ? parseEmployeeId(f.employeeId) : null;
    const out: AttendanceMonthRow[] = [];
    for (const e of people.sort((a, b) => a.name.localeCompare(b.name))) {
      const empRoutes = routesByEmployee.get(e.id) ?? [];
      if (onlyId !== null && e.id !== onlyId) continue;
      if (
        needle &&
        !`${e.name} ${formatEmployeeId(e.id)} ${e.role}`
          .toLowerCase()
          .includes(needle)
      )
        continue;
      if (f.role && e.role !== f.role) continue;
      if (f.routeId !== undefined && !empRoutes.some((r) => r.id === f.routeId))
        continue;
      const cells = dates.map((date) =>
        this.cell(
          e,
          date,
          today,
          facts,
          inMonth.find((r) => r.employeeId === e.id && r.date === date),
          locks,
        ),
      );
      const totals = monthTotals(
        cells.map((c, i) => ({
          code: c.code,
          future: c.future,
          day: dayInfo(dates[i], e, facts),
        })),
      );
      if (f.unmarked && totals.unmarked === 0) continue;
      out.push({
        employeeId: formatEmployeeId(e.id),
        name: e.name,
        role: e.role,
        category: e.category,
        routes: empRoutes,
        cells,
        totals,
      });
    }
    return {
      month,
      today,
      days: dates.map((date) => {
        const d = dayInfo(date, { id: -1, category: 'factory' }, facts);
        return {
          date,
          dayType: d.type,
          label: d.label,
          today: date === today,
          future: date > today,
        };
      }),
      rows: out,
      roles: [...new Set(employees.map((e) => e.role))].sort(),
      routes: routes.map((r) => ({ id: r.id, name: r.name })),
    };
  }

  /** Everyone for one date — the Day tab and the daily entry page. */
  async day(
    date: string,
    actor: Actor | null,
    now: Date = new Date(),
  ): Promise<AttendanceDay> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date must be YYYY-MM-DD.');
    }
    const today = localDate(now);
    const [employees, rows, facts, routesByEmployee, locks, windowDays] =
      await Promise.all([
        this.employees.find(),
        this.attendance.find({ where: { date } }),
        this.holidays.facts(date, date),
        this.employeeRoutes.routesByEmployee(),
        this.payrollLocks(),
        this.editWindowDays(),
      ]);
    const list = employees
      .filter(
        (e) => isActiveOn(e, date) || rows.some((r) => r.employeeId === e.id),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((e): AttendanceDayRow => {
        const r = rows.find((x) => x.employeeId === e.id && x.date === date);
        const d = dayInfo(date, e, facts);
        return {
          employeeId: formatEmployeeId(e.id),
          name: e.name,
          role: e.role,
          routes: routesByEmployee.get(e.id) ?? [],
          status: r?.status ?? null,
          code: r ? codeOf(r, d) : null,
          half: r?.half ?? null,
          shortOut: r?.shortOut?.slice(0, 5) ?? null,
          shortBack: r?.shortBack?.slice(0, 5) ?? null,
          holidayWorked: r?.holidayWorked ?? false,
          markedBy: r?.markedBy ?? null,
          markedAt: (r?.markedAt ?? r?.createdAt)?.toISOString() ?? null,
          source: r?.source ?? null,
          dayType: d.type,
          dayLabel: d.label,
          workAllowed: d.workAllowed,
          lockedReason: this.lockOf(e.id, date, r, locks),
        };
      });
    void actor;
    return {
      date,
      today,
      editWindowDays: windowDays,
      needsReason: daysBack(date, today) > windowDays,
      rows: list,
      summary: {
        present: list.filter(
          (r) =>
            r.code === 'P' ||
            r.code === 'W' ||
            r.code === 'S' ||
            r.code === 'H',
        ).length,
        absent: list.filter((r) => r.code === 'A').length,
        onLeave: list.filter((r) => r.code === 'L').length,
        notMarked: list.filter(
          (r) =>
            r.code === null &&
            (r.dayType === 'working' || r.dayType === 'half'),
        ).length,
      },
    };
  }

  // ── marking ─────────────────────────────────────────────────────────────

  /** Bulk roll-call for one date — every rule enforced here, not only in the portal. */
  async mark(
    dto: MarkAttendanceDto,
    actor: Actor,
    now: Date = new Date(),
  ): Promise<void> {
    const today = localDate(now);
    const level = await this.access.levelFor(actor.role, 'attendance');
    const windowDays = await this.editWindowDays();
    const why = editWindowError(dto.date, today, windowDays, level, dto.reason);
    if (why) {
      throw dto.date > today || why.includes('reason')
        ? new BadRequestException(why)
        : new ForbiddenException(why);
    }
    const older = daysBack(dto.date, today) > windowDays;

    const [employees, existing, facts, locks] = await Promise.all([
      this.employees.find(),
      this.attendance.find({ where: { date: dto.date } }),
      this.holidays.facts(dto.date, dto.date),
      this.payrollLocks(),
    ]);
    // check every record before writing any
    const plan: {
      e: EmployeeEntity;
      r: EmployeeAttendanceEntity | undefined;
      v: ReturnType<typeof resolveAttendance>;
    }[] = [];
    const problems: string[] = [];
    for (const rec of dto.records) {
      const id = parseEmployeeId(rec.employeeId);
      const e = employees.find((x) => x.id === id);
      if (!e) {
        problems.push(`${rec.employeeId}: no such employee`);
        continue;
      }
      const r = existing.find((x) => x.employeeId === id);
      const locked = this.lockOf(id, dto.date, r, locks);
      if (locked) {
        problems.push(`${e.name}: ${locked}`);
        continue;
      }
      const v = resolveAttendance(rec, dayInfo(dto.date, e, facts));
      if ('error' in v) problems.push(`${e.name}: ${v.error}`);
      else plan.push({ e, r, v });
    }
    if (problems.length) {
      throw new ConflictException(problems.join(' · '));
    }

    for (const { e, r, v } of plan) {
      if (!('ok' in v)) continue;
      const row =
        r ??
        this.attendance.create({
          employeeId: e.id,
          date: dto.date,
          leaveRequestId: null,
        });
      Object.assign(row, {
        status: v.ok.status,
        half: v.ok.half,
        shortOut: v.ok.shortOut,
        shortBack: v.ok.shortBack,
        holidayWorked: v.ok.holidayWorked,
        dayHours: String(v.ok.dayHours),
        dayOtHours: '0',
        nightHours: '0',
        nightOtHours: '0',
        markedBy: actor.name,
        markedAt: now,
        editReason: older ? dto.reason!.trim() : null,
        source: 'portal' as const,
      });
      await this.attendance.save(row);
      // One record, two views: an agent's Absent / Leave shows on the dispatch board
      await this.dispatch.syncFromAttendance(
        e.id,
        dto.date,
        v.ok.status,
        actor.name,
        now,
      );
    }

    await this.audit.record(actor, {
      action: `Marked attendance for ${plan.length} employee(s)`,
      module: 'Employee',
      record: dto.date,
      recordHref: `/employees/attendance?tab=day&date=${dto.date}`,
      details: older
        ? `Older than ${windowDays} days — ${dto.reason!.trim()}`
        : undefined,
    });
  }

  // ── helpers ─────────────────────────────────────────────────────────────

  private cell(
    e: EmployeeEntity,
    date: string,
    today: string,
    facts: CalendarFacts,
    r: EmployeeAttendanceEntity | undefined,
    locks: Set<string>,
  ): AttendanceCell {
    const d = dayInfo(date, e, facts);
    const future = date > today;
    const code = r && !future ? codeOf(r, d) : null;
    return {
      date,
      code,
      status: r?.status ?? null,
      tooltip: this.tooltip(date, d, r),
      dayType: d.type,
      dayLabel: d.label,
      future,
      lockedReason: this.lockOf(e.id, date, r, locks),
    };
  }

  private tooltip(
    date: string,
    d: DayInfo,
    r: EmployeeAttendanceEntity | undefined,
  ): string {
    const day = d.label ? ` · ${d.label}` : '';
    if (!r) return `${date}${day} · not marked`;
    let what: string = r.status;
    if (r.holidayWorked)
      what = `Worked on holiday${r.status !== 'Present' ? ` (${r.status})` : ''}`;
    else if (r.status === 'Half-day' && r.half) what = `Half-day (${r.half})`;
    else if (r.status === 'Short leave' && r.shortOut && r.shortBack) {
      what = `Short leave ${r.shortOut.slice(0, 5)}–${r.shortBack.slice(0, 5)}`;
    }
    return `${date}${day} · ${what}${r.markedBy ? ` · marked by ${r.markedBy}` : ''}`;
  }

  /** "employeeId:YYYY-MM" for every Processed payroll row — those months are locked for them. */
  private async payrollLocks(): Promise<Set<string>> {
    return new Set(
      (await this.payroll.find())
        .filter((p) => p.status === 'Processed')
        .map((p) => `${p.employeeId}:${p.period}`),
    );
  }

  private lockOf(
    employeeId: number,
    date: string,
    r: EmployeeAttendanceEntity | undefined,
    locks: Set<string>,
  ): string | null {
    if (locks.has(`${employeeId}:${keyToLabel(date.slice(0, 7))}`)) {
      return `${keyToLabel(date.slice(0, 7))} payroll is processed — attendance is locked.`;
    }
    if (r?.leaveRequestId) {
      return 'Approved leave — change it by cancelling or editing the leave request.';
    }
    return null;
  }
}
