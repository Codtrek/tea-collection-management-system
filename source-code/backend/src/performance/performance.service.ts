import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AppRole } from '../auth/role-map';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { gradedTotalKg, isGraded } from '../collections/collection-map';
import { CollectionSettingsService } from '../collections/collection-settings.service';
import { CollectionAgentEntity } from '../dispatch/collection-agent.entity';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { localDate } from '../dispatch/dispatch-map';
import { RouteAssignmentEntity } from '../dispatch/route-assignment.entity';
import { pickResponsible } from '../dispatch/route-resolver.service';
import {
  isScheduledOn,
  type RouteSchedule,
  RouteScheduleService,
} from '../dispatch/route-schedule.service';
import { EmployeeAttendanceEntity } from '../employees/employee-attendance.entity';
import { formatEmployeeId } from '../employees/employee-map';
import { EmployeeEntity } from '../employees/employee.entity';
import { EstateEntity } from '../estates/estate.entity';
import { RouteEntity } from '../estates/route.entity';
import { FertilizerDeliveryEntity } from '../fertilizer/fertilizer-delivery.entity';
import { FAIL_REASON_LABEL } from '../fertilizer/fertilizer-map';
import { HolidayService } from '../holidays/holiday.service';
import {
  type CalendarFacts,
  datesBetween,
  dayInfo,
} from '../holidays/working-days';
import {
  attendanceMeasures,
  averageOf,
  coverHelp,
  factNotes,
  fertilizerFirstAttempt,
  type GradedDelivery,
  kgMeasure,
  MIN_DELIVERIES,
  MIN_ROUTE_DAYS,
  MIN_WORKING_DAYS,
  SAME_WITHIN_POINTS,
  OWNER_SIDE,
  outsideTolerance,
  MIN_ROUTE_HISTORY_DAYS,
  type Measure,
  type MeasureKey,
  routeCompletion,
  type RouteDayKg,
  type Stop,
  trendOf,
  weightAccuracy,
} from './performance-rules';
import { PerformanceNoteEntity } from './performance-note.entity';

/** A collection request on a route day that ran: it was the agent's stop. */
const SCHEDULED = new Set([
  'approved',
  'agent_assigned',
  'collected',
  'confirmed',
]);
/** …and it was visited. */
const VISITED = new Set(['collected', 'confirmed']);

export const AGENT_MEASURES: MeasureKey[] = [
  'attendance',
  'absences',
  'routeCompletion',
  'kg',
  'weightAccuracy',
  'fertilizer',
  'coverHelp',
];
export const STAFF_MEASURES: MeasureKey[] = ['attendance', 'absences', 'leave'];

/** Measures we can't compute yet — shown as "Coming soon" with the reason, never faked. */
export const COMING_SOON = [
  {
    key: 'transportTime',
    label: 'Leaf transport time',
    reason:
      'Needs the agent app to record first pickup and factory receipt times.',
  },
  {
    key: 'punctuality',
    label: 'Punctuality',
    reason: 'Needs the agent app to record shift check-in times.',
  },
];

export interface Period {
  from: string;
  to: string;
  /** 'October 2026' or 'August – October 2026' */
  label: string;
}

export interface PersonMeasures {
  employeeId: string;
  name: string;
  role: string;
  measures: Partial<Record<MeasureKey, Measure>>;
  notes: string[];
}

interface Actor {
  role: AppRole;
  name?: string;
  sub?: number | null;
}

/** One row of a drill-down: the record behind a measure. */
export interface DrillRow {
  date: string;
  title: string;
  detail: string | null;
  /** e.g. "Owner-side" for a fertilizer failure that wasn't the agent's doing */
  tag: string | null;
}

export interface PublicNote {
  id: number;
  note: string;
  author: string;
  createdAt: string;
}

/** Everything the measures read, loaded once per request. */
interface Data {
  facts: CalendarFacts;
  schedules: Map<number, RouteSchedule>;
  assignments: RouteAssignmentEntity[];
  records: CollectionRecordEntity[];
  deliveries: FertilizerDeliveryEntity[];
  attendance: EmployeeAttendanceEntity[];
  routes: RouteEntity[];
  tolerancePct: number;
  today: string;
}

/**
 * THE one place performance measures are computed (Performance-Addendum §3) — the team table,
 * the employee tab and any report read this. No screen recalculates. Reading needs
 * `performance: view` (Manager, Administrator), checked here, not only in the UI.
 */
@Injectable()
export class PerformanceService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly employees: Repository<EmployeeEntity>,
    @InjectRepository(CollectionAgentEntity)
    private readonly agents: Repository<CollectionAgentEntity>,
    @InjectRepository(EmployeeAttendanceEntity)
    private readonly attendance: Repository<EmployeeAttendanceEntity>,
    @InjectRepository(CollectionRecordEntity)
    private readonly records: Repository<CollectionRecordEntity>,
    @InjectRepository(FertilizerDeliveryEntity)
    private readonly deliveries: Repository<FertilizerDeliveryEntity>,
    @InjectRepository(RouteAssignmentEntity)
    private readonly assignments: Repository<RouteAssignmentEntity>,
    @InjectRepository(RouteEntity)
    private readonly routes: Repository<RouteEntity>,
    private readonly holidays: HolidayService,
    private readonly schedule: RouteScheduleService,
    private readonly collectionSettings: CollectionSettingsService,
    private readonly access: DispatchAccessService,
    @InjectRepository(PerformanceNoteEntity)
    private readonly notes: Repository<PerformanceNoteEntity>,
    @InjectRepository(EstateEntity)
    private readonly estates: Repository<EstateEntity>,
    private readonly audit: AuditService,
  ) {}

  async requireView(actor: Actor): Promise<void> {
    await this.access.require(
      actor.role,
      'view',
      'see performance',
      'performance',
    );
  }

  /**
   * The team overview: collection agents (each against their own previous 3 months, averages
   * over agents) or other staff (attendance only, averages within each role).
   */
  async team(
    month: string,
    span: 1 | 3,
    group: 'agents' | 'staff',
    actor: Actor,
    now: Date = new Date(),
  ) {
    await this.requireView(actor);
    const period = periodOf(month, span, localDate(now));
    const before = previousThreeMonths(period.from);
    const data = await this.load(before.from, period.to, now);
    const [people, agentLinks] = await Promise.all([
      this.employees.find(),
      this.agents.find(),
    ]);
    const agentOf = new Map(
      agentLinks
        .filter((a) => a.hrEmployeeId !== null)
        .map((a) => [a.hrEmployeeId!, a.id]),
    );
    const active = people
      .filter((e) => e.status === 'Active')
      .sort((a, b) => a.name.localeCompare(b.name));
    const members = active.filter((e) =>
      group === 'agents' ? agentOf.has(e.id) : !agentOf.has(e.id),
    );

    const rows: PersonMeasures[] = members.map((e) => {
      const agentId = agentOf.get(e.id) ?? null;
      const now3 = this.measuresFor(e, agentId, period, data);
      const prev = this.measuresFor(e, agentId, before, data);
      const measures: PersonMeasures['measures'] = {};
      for (const k of group === 'agents' ? AGENT_MEASURES : STAFF_MEASURES) {
        if (now3[k]) measures[k] = trendOf(now3[k], prev[k] ?? null);
      }
      return {
        employeeId: formatEmployeeId(e.id),
        name: e.name,
        role: e.role,
        measures,
        notes: [],
      };
    });

    // averages: over agents, or within each role for other staff
    const groups = new Map<string, PersonMeasures[]>();
    for (const r of rows) {
      const g = group === 'agents' ? 'Collection agents' : r.role;
      groups.set(g, [...(groups.get(g) ?? []), r]);
    }
    const averages: Record<
      string,
      Partial<Record<MeasureKey, number | null>>
    > = {};
    for (const [g, list] of groups) {
      const keys = group === 'agents' ? AGENT_MEASURES : STAFF_MEASURES;
      averages[g] = Object.fromEntries(
        keys.map((k) => [
          k,
          averageOf(
            list.map((r) => r.measures[k]).filter((m): m is Measure => !!m),
          ),
        ]),
      );
      for (const r of list) {
        r.notes = factNotes(
          r.measures,
          averages[g],
          period.label,
          group === 'agents' ? 'agent' : 'role',
        );
      }
    }

    return {
      month,
      span,
      group,
      period,
      tolerancePct: data.tolerancePct,
      measures: group === 'agents' ? AGENT_MEASURES : STAFF_MEASURES,
      rows,
      averages,
      comingSoon: group === 'agents' ? COMING_SOON : [],
    };
  }

  // ── the measures for one person over one period ──────────────────────────

  measuresFor(
    e: EmployeeEntity,
    agentId: number | null,
    period: Pick<Period, 'from' | 'to'>,
    data: Data,
  ): Partial<Record<MeasureKey, Measure>> {
    const out: Partial<Record<MeasureKey, Measure>> = {};
    const att = attendanceMeasures(this.attendanceDays(e, period, data));
    out.attendance = att.attendance;
    out.absences = att.absences;
    out.leave = att.leave;
    if (agentId === null) return out;

    const routeDays = this.routeDays(agentId, period, data);
    out.routeCompletion = routeCompletion(
      this.stopsOn(routeDays, data),
      routeDays.length,
    );
    const mine = this.collectedBy(agentId, period, data);
    out.kg = kgMeasure(
      this.kgByRouteDay(agentId, routeDays, period, data),
      mine.reduce((s, r) => s + Number(r.weightKg), 0),
    );
    out.weightAccuracy = weightAccuracy(this.graded(mine), data.tolerancePct);
    out.fertilizer = fertilizerFirstAttempt(
      this.firstAttempts(agentId, period, data).map((d) => ({
        outcome: d.outcome!,
        failReason: d.failReason ?? null,
      })),
    );
    out.coverHelp = coverHelp(
      data.assignments
        .filter(
          (a) =>
            a.type === 'COVER' &&
            a.agentId === agentId &&
            a.validFrom >= period.from &&
            a.validFrom <= period.to,
        )
        .map((a) => a.status),
    );
    return out;
  }

  /** The live settings behind the "How performance is measured" page — straight from the rules. */
  async definitions(actor: Actor) {
    await this.requireView(actor);
    return {
      tolerancePct: (await this.collectionSettings.get()).mismatchTolerancePct,
      minimums: {
        workingDays: MIN_WORKING_DAYS,
        routeDays: MIN_ROUTE_DAYS,
        deliveries: MIN_DELIVERIES,
        routeHistoryDays: MIN_ROUTE_HISTORY_DAYS,
      },
      sameWithinPoints: SAME_WITHIN_POINTS,
      comingSoon: COMING_SOON,
    };
  }

  // ── one employee: the last 6 months, drill-downs, notes ──────────────────

  /** The same measures month by month (the employee's Performance tab), each against their own previous 3 months. */
  async employee(
    employeeId: number,
    months: number,
    actor: Actor,
    now: Date = new Date(),
  ) {
    await this.requireView(actor);
    const { e, agentId } = await this.person(employeeId);
    const today = localDate(now);
    const last = lastCompleteMonth(today);
    const list = Array.from({ length: months }, (_, i) =>
      shiftMonth(last, i - months + 1),
    );
    const data = await this.load(
      previousThreeMonths(`${list[0]}-01`).from,
      periodOf(last, 1, today).to,
      now,
    );
    const keys = agentId === null ? STAFF_MEASURES : AGENT_MEASURES;
    return {
      employeeId: formatEmployeeId(e.id),
      name: e.name,
      role: e.role,
      isAgent: agentId !== null,
      tolerancePct: data.tolerancePct,
      measures: keys,
      months: list.map((month) => {
        const period = periodOf(month, 1, today);
        const cur = this.measuresFor(e, agentId, period, data);
        const prev = this.measuresFor(
          e,
          agentId,
          previousThreeMonths(period.from),
          data,
        );
        return {
          month,
          label: period.label,
          measures: Object.fromEntries(
            keys
              .filter((k) => cur[k])
              .map((k) => [k, trendOf(cur[k]!, prev[k] ?? null)]),
          ),
        };
      }),
      comingSoon: agentId === null ? [] : COMING_SOON,
      notes: await this.listNotes(e.id),
    };
  }

  /** The records behind one measure in one month — missed stops, deliveries outside the tolerance … */
  async drill(
    employeeId: number,
    measure: MeasureKey,
    month: string,
    actor: Actor,
    now: Date = new Date(),
  ): Promise<{
    measure: MeasureKey;
    month: string;
    label: string;
    rows: DrillRow[];
  }> {
    await this.requireView(actor);
    const { e, agentId } = await this.person(employeeId);
    const today = localDate(now);
    const period = periodOf(month, 1, today);
    const data = await this.load(
      previousThreeMonths(period.from).from,
      period.to,
      now,
    );
    const routeName = (id: number) =>
      data.routes.find((r) => r.id === id)?.name ?? `Route ${id}`;
    const kg = (v: number) => `${Math.round(v * 10) / 10} kg`;
    let rows: DrillRow[] = [];

    if (
      measure === 'attendance' ||
      measure === 'absences' ||
      measure === 'leave'
    ) {
      rows = this.attendanceDays(e, period, data)
        .filter(
          (d) =>
            d.working && d.status !== 'Present' && d.status !== 'Short leave',
        )
        .filter((d) => measure !== 'absences' || d.status === 'Absent')
        .filter((d) => measure !== 'leave' || d.status === 'Leave')
        .map((d) => ({
          date: d.date,
          title: d.status ?? 'Not marked',
          detail:
            d.status === null
              ? 'Left out of the rate — nobody marked this day'
              : d.status === 'Leave'
                ? 'Leave — left out of the rate'
                : null,
          tag: null,
        }));
    } else {
      if (agentId === null) {
        throw new BadRequestException('This measure is for collection agents.');
      }
      const routeDays = this.routeDays(agentId, period, data);
      if (measure === 'routeCompletion') {
        rows = this.stopsOn(routeDays, data)
          .filter((s) => !s.visited)
          .map((s) => ({
            date: s.date,
            title: s.estateName,
            detail: `${routeName(s.routeId)} · reason not recorded`,
            tag: null,
          }));
      } else if (measure === 'kg') {
        rows = this.kgByRouteDay(agentId, routeDays, period, data).map((d) => ({
          date: d.date,
          title: routeName(d.routeId),
          detail: `${kg(d.kg)} · route average ${d.routeAverage === null ? 'not enough history' : kg(d.routeAverage)}`,
          tag: null,
        }));
      } else if (measure === 'weightAccuracy') {
        rows = outsideTolerance(
          this.graded(this.collectedBy(agentId, period, data)),
          data.tolerancePct,
        ).map((d) => ({
          date: d.date,
          title: `${d.estateName} (${d.id})`,
          detail: `Estate ${kg(d.estateKg)} · factory ${kg(d.factoryKg)} · ${Math.round((Math.abs(d.estateKg - d.factoryKg) / d.estateKg) * 1000) / 10}% apart (tolerance ${data.tolerancePct}%)`,
          tag: null,
        }));
      } else if (measure === 'fertilizer') {
        const estates = await this.estates.find();
        rows = this.firstAttempts(agentId, period, data)
          .filter((d) => d.outcome === 'failed')
          .map((d) => ({
            date: d.scheduledDate,
            title:
              estates.find((x) => x.id === d.estateId)?.name ??
              d.ownerName ??
              `Estate ${d.estateId}`,
            detail: FAIL_REASON_LABEL[d.failReason ?? 'other'],
            tag:
              d.failReason && OWNER_SIDE.includes(d.failReason)
                ? 'Owner-side'
                : null,
          }));
      } else if (measure === 'coverHelp') {
        rows = data.assignments
          .filter(
            (a) =>
              a.type === 'COVER' &&
              a.agentId === agentId &&
              a.validFrom >= period.from &&
              a.validFrom <= period.to,
          )
          .map((a) => ({
            date: a.validFrom,
            title: routeName(a.routeId),
            detail: COVER_STATUS[a.status] ?? a.status,
            tag: null,
          }));
      }
    }
    return {
      measure,
      month,
      label: period.label,
      rows: rows.sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  /** A dated note from a conversation — `performance: edit` (Manager, Administrator); audited. */
  async addNote(
    employeeId: number,
    note: string,
    actor: Actor,
    now: Date = new Date(),
  ): Promise<PublicNote> {
    await this.access.require(
      actor.role,
      'edit',
      'add performance notes',
      'performance',
    );
    const text = note.trim();
    if (!text) throw new BadRequestException('Write the note first.');
    const { e } = await this.person(employeeId);
    const saved = await this.notes.save(
      this.notes.create({
        employeeId: e.id,
        note: text,
        author: actor.name ?? 'Unknown',
        authorUserId: actor.sub ?? null,
        createdAt: now,
      }),
    );
    await this.audit.record(
      { name: actor.name ?? 'Unknown', role: actor.role, sub: actor.sub },
      {
        action: 'Added a performance note',
        module: 'Performance',
        record: e.name,
        recordHref: `/employees/${formatEmployeeId(e.id)}?tab=performance`,
      },
    );
    return toNote(saved);
  }

  private async listNotes(employeeId: number): Promise<PublicNote[]> {
    return (await this.notes.find({ where: { employeeId } }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .map(toNote);
  }

  private async person(employeeId: number) {
    const [e, agents] = await Promise.all([
      this.employees.findOne({ where: { id: employeeId } }),
      this.agents.find(),
    ]);
    if (!e)
      throw new NotFoundException(
        `No employee ${formatEmployeeId(employeeId)}.`,
      );
    const agentId = agents.find((a) => a.hrEmployeeId === e.id)?.id ?? null;
    return { e, agentId };
  }

  // ── data ───────────────────────────────────────────────────────────────

  async load(from: string, to: string, now: Date): Promise<Data> {
    const [
      facts,
      schedules,
      assignments,
      records,
      deliveries,
      attendance,
      routes,
      settings,
    ] = await Promise.all([
      this.holidays.facts(from, to),
      this.schedule.allSchedules(),
      this.assignments.find(),
      this.records.find({ relations: { gradeLines: true } }),
      this.deliveries.find(),
      this.attendance.find(),
      this.routes.find(),
      this.collectionSettings.get(),
    ]);
    return {
      facts,
      schedules,
      assignments,
      records,
      deliveries,
      attendance,
      routes,
      tolerancePct: settings.mismatchTolerancePct,
      today: localDate(now),
    };
  }

  /** Days up to today; the working-day rule (holidays, rest days, weekly holiday) decides `working`. */
  attendanceDays(
    e: EmployeeEntity,
    period: Pick<Period, 'from' | 'to'>,
    data: Data,
  ) {
    const last = period.to < data.today ? period.to : data.today;
    if (last < period.from) return [];
    const mine = data.attendance.filter((a) => a.employeeId === e.id);
    return datesBetween(period.from, last).map((date) => {
      const day = dayInfo(date, e, data.facts);
      const r = mine.find((a) => a.date === date);
      return {
        date,
        working: day.working,
        weight: day.weight,
        status: r ? r.status : null,
      };
    });
  }

  /**
   * The agent's route days: a route that ran that day (a CANCEL override — holiday or closure —
   * means it didn't) with this agent responsible, own route or an accepted cover.
   */
  routeDays(
    agentId: number,
    period: Pick<Period, 'from' | 'to'>,
    data: Data,
  ): { date: string; routeId: number; covering: boolean }[] {
    const last = period.to < data.today ? period.to : data.today;
    if (last < period.from) return [];
    const active = data.assignments.filter((a) => a.status === 'ACTIVE');
    const out: { date: string; routeId: number; covering: boolean }[] = [];
    for (const date of datesBetween(period.from, last)) {
      for (const [routeId, s] of data.schedules) {
        if (!isScheduledOn(s, date)) continue;
        const who = pickResponsible(
          active.filter((a) => a.routeId === routeId),
          date,
        );
        if (who?.agentId === agentId) {
          out.push({ date, routeId, covering: who.covering });
        }
      }
    }
    return out;
  }

  stopsOn(routeDays: { date: string; routeId: number }[], data: Data): Stop[] {
    const key = new Set(routeDays.map((d) => `${d.routeId}:${d.date}`));
    return data.records
      .filter(
        (r) =>
          r.routeId !== null &&
          key.has(`${r.routeId}:${r.collectionDate}`) &&
          SCHEDULED.has(r.status),
      )
      .map((r) => ({
        date: r.collectionDate,
        routeId: r.routeId!,
        estateName: r.estateName,
        visited: VISITED.has(r.status),
      }));
  }

  collectedBy(
    agentId: number,
    period: Pick<Period, 'from' | 'to'>,
    data: Data,
  ): CollectionRecordEntity[] {
    return data.records.filter(
      (r) =>
        r.agentId === agentId &&
        VISITED.has(r.status) &&
        r.collectionDate >= period.from &&
        r.collectionDate <= period.to,
    );
  }

  /**
   * kg per route day (days that had stops), each against THAT route's average per collection
   * day over the 3 months before the period — a cover day uses the covered route's history.
   */
  kgByRouteDay(
    agentId: number,
    routeDays: { date: string; routeId: number }[],
    period: Pick<Period, 'from' | 'to'>,
    data: Data,
  ): RouteDayKg[] {
    const before = previousThreeMonths(period.from);
    const avg = new Map<number, number | null>();
    const routeAverage = (routeId: number) => {
      if (!avg.has(routeId)) {
        const byDay = new Map<string, number>();
        for (const r of data.records) {
          if (
            r.routeId === routeId &&
            VISITED.has(r.status) &&
            r.collectionDate >= before.from &&
            r.collectionDate <= before.to
          ) {
            byDay.set(
              r.collectionDate,
              (byDay.get(r.collectionDate) ?? 0) + Number(r.weightKg),
            );
          }
        }
        const days = [...byDay.values()];
        // too short a history is no baseline: the day counts as "no history"
        avg.set(
          routeId,
          days.length >= MIN_ROUTE_HISTORY_DAYS
            ? days.reduce((s, v) => s + v, 0) / days.length
            : null,
        );
      }
      return avg.get(routeId)!;
    };
    // only route days with at least one stop: a day no estate asked for leaf isn't 0 kg against the route
    const withStops = new Set(
      data.records
        .filter((r) => SCHEDULED.has(r.status))
        .map((r) => `${r.routeId}:${r.collectionDate}`),
    );
    return routeDays
      .filter((d) => withStops.has(`${d.routeId}:${d.date}`))
      .map((d) => ({
        date: d.date,
        routeId: d.routeId,
        kg: data.records
          .filter(
            (r) =>
              r.agentId === agentId &&
              r.routeId === d.routeId &&
              r.collectionDate === d.date &&
              VISITED.has(r.status),
          )
          .reduce((s, r) => s + Number(r.weightKg), 0),
        routeAverage: routeAverage(d.routeId),
      }));
  }

  /** Graded deliveries: estate weight vs the factory's graded total (current lines = the latest approved revision). */
  graded(records: CollectionRecordEntity[]): GradedDelivery[] {
    return records.filter(isGraded).map((r) => ({
      id: r.id,
      date: r.collectionDate,
      estateName: r.estateName,
      estateKg: Number(r.weightKg),
      factoryKg: gradedTotalKg(r),
    }));
  }

  firstAttempts(
    agentId: number,
    period: Pick<Period, 'from' | 'to'>,
    data: Data,
  ): FertilizerDeliveryEntity[] {
    return data.deliveries.filter(
      (d) =>
        d.attemptNo === 1 &&
        d.pickupAgentId === agentId &&
        d.outcome !== null &&
        !d.cancelledAt &&
        d.scheduledDate >= period.from &&
        d.scheduledDate <= period.to,
    );
  }
}

// ── periods ───────────────────────────────────────────────────────────────

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

function lastDay(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`;
}

/** The month (or the 3 months ending with it), never past today. */
export function periodOf(month: string, span: 1 | 3, today: string): Period {
  const first = shiftMonth(month, -(span - 1));
  const end = lastDay(month);
  const name = (m: string) =>
    `${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;
  return {
    from: `${first}-01`,
    to: end < today ? end : today,
    label:
      span === 1
        ? name(month)
        : `${MONTHS[Number(first.slice(5)) - 1]} – ${name(month)}`,
  };
}

/** The 3 whole months before `from` (the person's own baseline). */
export function previousThreeMonths(from: string): Period {
  const month = from.slice(0, 7);
  const start = shiftMonth(month, -3);
  const end = shiftMonth(month, -1);
  return { from: `${start}-01`, to: lastDay(end), label: 'previous 3 months' };
}

/** The last month that has fully ended — the page's default. */
export function lastCompleteMonth(today: string): string {
  return shiftMonth(today.slice(0, 7), -1);
}

const COVER_STATUS: Record<string, string> = {
  ACTIVE: 'Accepted',
  DECLINED: 'Declined',
  EXPIRED: 'Expired — no answer',
  PENDING: 'Waiting for an answer',
  CANCELLED: 'Cancelled',
};

function toNote(n: PerformanceNoteEntity): PublicNote {
  return {
    id: n.id,
    note: n.note,
    author: n.author,
    createdAt: new Date(n.createdAt).toISOString(),
  };
}
