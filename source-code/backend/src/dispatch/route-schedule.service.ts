import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { RouteEntity } from '../estates/route.entity';
import { AgentDirectoryService } from './agent-directory.service';
import { addDays, localDate, windowIncludes } from './dispatch-map';
import { DispatchNotifier } from './dispatch-notifier.service';
import type { DispatchActor } from './dispatch.service';
import { RouteAssignmentEntity } from './route-assignment.entity';
import { RouteLoadService } from './route-load.service';
import {
  type OverrideKind,
  RouteScheduleOverrideEntity,
  RouteScheduleWeekdayEntity,
} from './route-schedule.entity';

/** How far ahead the next collection day and the one-route-per-agent check look. */
export const SCHEDULE_HORIZON_DAYS = 366;

/** Days the schedule view lays out from today. */
export const SCHEDULE_VIEW_DAYS = 28;

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** One route's schedule: the weekly pattern plus its one-date overrides. */
export interface RouteSchedule {
  weekdays: number[];
  overrides: { date: string; kind: OverrideKind }[];
}

export interface PublicScheduleOverride {
  id: number;
  date: string;
  kind: OverrideKind;
  reason: string;
  moveGroup: string | null;
  createdBy: string;
}

export interface PublicRouteSchedule {
  routeId: number;
  routeName: string;
  weekdays: number[];
  /** Overrides from today on. */
  overrides: PublicScheduleOverride[];
  /** Today plus the next days, each marked scheduled or not (and why, when an override decides it). */
  upcoming: {
    date: string;
    scheduled: boolean;
    override: OverrideKind | null;
  }[];
  /** First scheduled date strictly after today. */
  nextCollectionDay: string | null;
}

/* ── Pure rules — exported for tests and the only place the schedule is interpreted ── */

/** 0 = Sunday … 6 = Saturday for a 'YYYY-MM-DD' date. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Does the route run on `date`? An override wins over the weekly pattern. */
export function isScheduledOn(s: RouteSchedule, date: string): boolean {
  const override = s.overrides.find((o) => o.date === date);
  if (override) return override.kind === 'ADD';
  return s.weekdays.includes(weekdayOf(date));
}

/** First scheduled date STRICTLY AFTER `fromDate`, within the horizon; null when none. */
export function nextScheduledDate(
  s: RouteSchedule,
  fromDate: string,
  horizonDays: number = SCHEDULE_HORIZON_DAYS,
): string | null {
  for (let i = 1; i <= horizonDays; i++) {
    const date = addDays(fromDate, i);
    if (isScheduledOn(s, date)) return date;
  }
  return null;
}

/**
 * THE one place that answers "does route R run on date D" and "when does it run next"
 * (Route-Schedule-Addendum §2). Who runs it is still `RouteResolverService.getAgentForRoute`;
 * callers ask both. Every write is audited under Dispatch.
 */
@Injectable()
export class RouteScheduleService {
  constructor(
    @InjectRepository(RouteScheduleWeekdayEntity)
    private readonly weekdayRepo: Repository<RouteScheduleWeekdayEntity>,
    @InjectRepository(RouteScheduleOverrideEntity)
    private readonly overrideRepo: Repository<RouteScheduleOverrideEntity>,
    @InjectRepository(RouteEntity)
    private readonly routes: Repository<RouteEntity>,
    @InjectRepository(RouteAssignmentEntity)
    private readonly assignments: Repository<RouteAssignmentEntity>,
    private readonly load: RouteLoadService,
    private readonly directory: AgentDirectoryService,
    private readonly notifier: DispatchNotifier,
    private readonly audit: AuditService,
  ) {}

  /* ── Reads ─────────────────────────────────────────────────────── */

  async scheduleOf(routeId: number): Promise<RouteSchedule> {
    const [days, overrides] = await Promise.all([
      this.weekdayRepo.find({ where: { routeId } }),
      this.overrideRepo.find({ where: { routeId } }),
    ]);
    return {
      weekdays: days.map((d) => Number(d.weekday)).sort((a, b) => a - b),
      overrides: overrides.map((o) => ({ date: o.date, kind: o.kind })),
    };
  }

  /** Every route's schedule in two queries — for lists and the board. */
  async allSchedules(): Promise<Map<number, RouteSchedule>> {
    const [routeRows, days, overrides] = await Promise.all([
      this.routes.find(),
      this.weekdayRepo.find(),
      this.overrideRepo.find(),
    ]);
    const out = new Map<number, RouteSchedule>();
    for (const r of routeRows) out.set(r.id, { weekdays: [], overrides: [] });
    for (const d of days) {
      out.get(d.routeId)?.weekdays.push(Number(d.weekday));
    }
    for (const o of overrides) {
      out.get(o.routeId)?.overrides.push({ date: o.date, kind: o.kind });
    }
    return out;
  }

  async isScheduled(routeId: number, date: string): Promise<boolean> {
    return isScheduledOn(await this.scheduleOf(routeId), date);
  }

  /** The route's next collection day strictly after `fromDate`, or null within the horizon. */
  async nextCollectionDay(
    routeId: number,
    fromDate: string,
  ): Promise<string | null> {
    return nextScheduledDate(await this.scheduleOf(routeId), fromDate);
  }

  /** Ids of the routes that run on `date`. */
  async scheduledRoutesOn(date: string): Promise<Set<number>> {
    const out = new Set<number>();
    for (const [routeId, s] of await this.allSchedules()) {
      if (isScheduledOn(s, date)) out.add(routeId);
    }
    return out;
  }

  async view(
    routeId: number,
    now: Date = new Date(),
  ): Promise<PublicRouteSchedule> {
    const route = await this.requireRoute(routeId);
    const today = localDate(now);
    const schedule = await this.scheduleOf(routeId);
    const overrides = (await this.overrideRepo.find({ where: { routeId } }))
      .filter((o) => o.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    const upcoming = Array.from({ length: SCHEDULE_VIEW_DAYS }, (_, i) => {
      const date = addDays(today, i);
      return {
        date,
        scheduled: isScheduledOn(schedule, date),
        override: schedule.overrides.find((o) => o.date === date)?.kind ?? null,
      };
    });
    return {
      routeId: route.id,
      routeName: route.name ?? `Route ${route.id}`,
      weekdays: schedule.weekdays,
      overrides: overrides.map((o) => ({
        id: o.id,
        date: o.date,
        kind: o.kind,
        reason: o.reason,
        moveGroup: o.moveGroup,
        createdBy: o.createdBy,
      })),
      upcoming,
      nextCollectionDay: nextScheduledDate(schedule, today),
    };
  }

  /**
   * Would `agentId` end up scheduled on two of his permanent routes on the same date if
   * `routeId` ran on `proposed` (default: its current schedule)? Checks every date from
   * `fromDate` over the horizon on which he holds `routeId` permanently. Returns the first
   * clash, or null. Also used before a permanent reassignment.
   */
  async agentClash(
    agentId: number,
    routeId: number,
    fromDate: string,
    opts: {
      proposed?: RouteSchedule;
      /** Treat the agent as holding `routeId` from `fromDate` even without an assignment yet. */
      assumeHolds?: boolean;
    } = {},
  ): Promise<{ date: string; otherRouteId: number } | null> {
    const schedules = await this.allSchedules();
    const target = opts.proposed ?? schedules.get(routeId);
    if (!target) return null;
    const permanents = (
      await this.assignments.find({ where: { agentId, status: 'ACTIVE' } })
    ).filter((a) => a.type === 'PERMANENT');

    for (let i = 0; i < SCHEDULE_HORIZON_DAYS; i++) {
      const date = addDays(fromDate, i);
      if (!isScheduledOn(target, date)) continue;
      const holds =
        opts.assumeHolds ||
        permanents.some(
          (a) => a.routeId === routeId && windowIncludes(a, date),
        );
      if (!holds) continue;
      const other = permanents.find(
        (a) =>
          a.routeId !== routeId &&
          windowIncludes(a, date) &&
          isScheduledOn(
            schedules.get(a.routeId) ?? { weekdays: [], overrides: [] },
            date,
          ),
      );
      if (other) return { date, otherRouteId: other.routeId };
    }
    return null;
  }

  /* ── Writes ────────────────────────────────────────────────────── */

  /** Replace the weekly pattern (needs `dispatch: approve`, checked by the controller). */
  async setWeekdays(
    routeId: number,
    weekdays: number[],
    actor: DispatchActor,
    now: Date = new Date(),
  ): Promise<PublicRouteSchedule> {
    const route = await this.requireRoute(routeId);
    const days = [...new Set(weekdays)].sort((a, b) => a - b);
    if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
      throw new BadRequestException('Weekdays must be whole numbers 0–6.');
    }
    const current = await this.scheduleOf(routeId);
    const proposed: RouteSchedule = { ...current, weekdays: days };
    await this.guardChange(route, current, proposed, now);

    await this.weekdayRepo.delete({ routeId });
    if (days.length > 0) {
      await this.weekdayRepo.save(
        days.map((weekday) => this.weekdayRepo.create({ routeId, weekday })),
      );
    }
    await this.cancelCoversOnDroppedDates(route, current, proposed, now);
    await this.audit.record(actor, {
      action: 'Changed route weekly schedule',
      module: 'Dispatch',
      record: this.label(route),
      details: `${describeWeekdays(current.weekdays)} → ${describeWeekdays(days)}`,
    });
    return this.view(routeId, now);
  }

  /** Add or cancel a single date (needs `dispatch: edit`). */
  async addOverride(
    routeId: number,
    input: { date: string; kind: OverrideKind; reason: string },
    actor: DispatchActor,
    now: Date = new Date(),
  ): Promise<PublicRouteSchedule> {
    const route = await this.requireRoute(routeId);
    const reason = this.requireReason(input.reason);
    const current = await this.scheduleOf(routeId);
    this.assertEditableDate(input.date, now);
    await this.assertNoOverride(routeId, input.date);
    if (input.kind === 'ADD' && isScheduledOn(current, input.date)) {
      throw new ConflictException(
        `${this.label(route)} already runs on ${input.date}.`,
      );
    }
    if (input.kind === 'CANCEL' && !isScheduledOn(current, input.date)) {
      throw new ConflictException(
        `${this.label(route)} doesn't run on ${input.date}, so there is nothing to cancel.`,
      );
    }
    const proposed: RouteSchedule = {
      ...current,
      overrides: [...current.overrides, { date: input.date, kind: input.kind }],
    };
    await this.guardChange(route, current, proposed, now);

    await this.overrideRepo.save(
      this.overrideRepo.create({
        routeId,
        date: input.date,
        kind: input.kind,
        reason,
        moveGroup: null,
        createdBy: actor.name,
      }),
    );
    await this.cancelCoversOnDroppedDates(route, current, proposed, now);
    await this.audit.record(actor, {
      action:
        input.kind === 'ADD'
          ? 'Added a route collection date'
          : 'Cancelled a route collection date',
      module: 'Dispatch',
      record: `${this.label(route)} · ${input.date}`,
      details: reason,
    });
    return this.view(routeId, now);
  }

  /** Move one collection date to another (needs `dispatch: edit`). */
  async moveDate(
    routeId: number,
    input: { fromDate: string; toDate: string; reason: string },
    actor: DispatchActor,
    now: Date = new Date(),
  ): Promise<PublicRouteSchedule> {
    const route = await this.requireRoute(routeId);
    const reason = this.requireReason(input.reason);
    if (input.fromDate === input.toDate) {
      throw new BadRequestException('Pick a different date to move to.');
    }
    this.assertEditableDate(input.fromDate, now);
    this.assertEditableDate(input.toDate, now);
    await this.assertNoOverride(routeId, input.fromDate);
    await this.assertNoOverride(routeId, input.toDate);
    const current = await this.scheduleOf(routeId);
    if (!isScheduledOn(current, input.fromDate)) {
      throw new ConflictException(
        `${this.label(route)} doesn't run on ${input.fromDate}.`,
      );
    }
    if (isScheduledOn(current, input.toDate)) {
      throw new ConflictException(
        `${this.label(route)} already runs on ${input.toDate}.`,
      );
    }
    const proposed: RouteSchedule = {
      ...current,
      overrides: [
        ...current.overrides,
        { date: input.fromDate, kind: 'CANCEL' },
        { date: input.toDate, kind: 'ADD' },
      ],
    };
    await this.guardChange(route, current, proposed, now);

    const moveGroup = randomUUID();
    await this.overrideRepo.save([
      this.overrideRepo.create({
        routeId,
        date: input.fromDate,
        kind: 'CANCEL',
        reason,
        moveGroup,
        createdBy: actor.name,
      }),
      this.overrideRepo.create({
        routeId,
        date: input.toDate,
        kind: 'ADD',
        reason,
        moveGroup,
        createdBy: actor.name,
      }),
    ]);
    await this.cancelCoversOnDroppedDates(route, current, proposed, now);
    await this.audit.record(actor, {
      action: 'Moved a route collection date',
      module: 'Dispatch',
      record: `${this.label(route)} · ${input.fromDate} → ${input.toDate}`,
      details: reason,
    });
    return this.view(routeId, now);
  }

  /** Remove an override (both halves of a move), restoring the weekly pattern for those dates. */
  async removeOverride(
    routeId: number,
    overrideId: number,
    actor: DispatchActor,
    now: Date = new Date(),
  ): Promise<PublicRouteSchedule> {
    const route = await this.requireRoute(routeId);
    const row = await this.overrideRepo.findOne({
      where: { id: overrideId, routeId },
    });
    if (!row) {
      throw new NotFoundException(
        `No schedule override ${overrideId} on ${this.label(route)}.`,
      );
    }
    const group = row.moveGroup
      ? await this.overrideRepo.find({
          where: { routeId, moveGroup: row.moveGroup },
        })
      : [row];
    for (const o of group) this.assertEditableDate(o.date, now);

    const current = await this.scheduleOf(routeId);
    const dropped = new Set(group.map((o) => o.date));
    const proposed: RouteSchedule = {
      ...current,
      overrides: current.overrides.filter((o) => !dropped.has(o.date)),
    };
    await this.guardChange(route, current, proposed, now);

    for (const o of group) await this.overrideRepo.delete({ id: o.id });
    await this.cancelCoversOnDroppedDates(route, current, proposed, now);
    await this.audit.record(actor, {
      action: 'Removed a route schedule override',
      module: 'Dispatch',
      record: `${this.label(route)} · ${group.map((o) => `${o.kind} ${o.date}`).join(', ')}`,
    });
    return this.view(routeId, now);
  }

  /* ── internals ─────────────────────────────────────────────────── */

  /**
   * Checks a schedule change against the §4 rules before anything is written: no
   * un-scheduling today once collection started, and no agent scheduled on two of his
   * routes on one date.
   */
  private async guardChange(
    route: RouteEntity,
    current: RouteSchedule,
    proposed: RouteSchedule,
    now: Date,
  ): Promise<void> {
    const today = localDate(now);
    if (
      isScheduledOn(current, today) &&
      !isScheduledOn(proposed, today) &&
      (await this.load.hasCollectionStarted(route.id, today))
    ) {
      throw new ConflictException(
        `${this.label(route)} has already started collecting today, so today can't be taken off its schedule.`,
      );
    }

    const holders = new Set(
      (await this.assignments.find({ where: { routeId: route.id } }))
        .filter(
          (a) =>
            a.type === 'PERMANENT' &&
            a.status === 'ACTIVE' &&
            (a.validTo === null || a.validTo >= today),
        )
        .map((a) => a.agentId),
    );
    for (const agentId of holders) {
      const clash = await this.agentClash(agentId, route.id, today, {
        proposed,
      });
      if (clash) {
        const name =
          (await this.directory.names()).get(agentId) ?? `Agent ${agentId}`;
        const other = await this.routes.findOne({
          where: { id: clash.otherRouteId },
        });
        throw new ConflictException(
          `${name} would run both ${this.label(route)} and ${other ? this.label(other) : `Route ${clash.otherRouteId}`} on ${clash.date}. An agent runs one route per day.`,
        );
      }
    }
  }

  /** A cover on a date the change took off the schedule is cancelled and its agent told. */
  private async cancelCoversOnDroppedDates(
    route: RouteEntity,
    current: RouteSchedule,
    proposed: RouteSchedule,
    now: Date,
  ): Promise<void> {
    const today = localDate(now);
    const covers = (
      await this.assignments.find({ where: { routeId: route.id } })
    ).filter(
      (a) =>
        a.type === 'COVER' &&
        (a.status === 'ACTIVE' || a.status === 'PENDING') &&
        (a.validTo === null || a.validTo >= today),
    );
    for (const c of covers) {
      // Covers are one-day; the date that matters is the one the cover is for.
      const date = c.validFrom < today ? today : c.validFrom;
      if (!isScheduledOn(current, date) || isScheduledOn(proposed, date)) {
        continue;
      }
      c.status = 'CANCELLED';
      c.respondedAt = now;
      c.reason = `${c.reason ? `${c.reason} · ` : ''}Collection date taken off the schedule`;
      await this.assignments.save(c);
      await this.notifier.notifyAgent(c.agentId, {
        type: 'cover_response',
        title: 'Cover cancelled',
        body: `${this.label(route)} no longer runs on ${date}, so you don't need to cover it.`,
        referenceId: c.id,
        referenceType: 'route_assignments',
      });
    }
  }

  private assertEditableDate(date: string, now: Date): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Dates must be YYYY-MM-DD.');
    }
    if (date < localDate(now)) {
      throw new BadRequestException(
        `${date} is in the past; past collection dates can't be changed.`,
      );
    }
  }

  private async assertNoOverride(routeId: number, date: string): Promise<void> {
    const existing = await this.overrideRepo.findOne({
      where: { routeId, date },
    });
    if (existing) {
      throw new ConflictException(
        `${date} already has a schedule change (${existing.kind === 'ADD' ? 'added' : 'cancelled'}). Remove it first.`,
      );
    }
  }

  private requireReason(reason: string): string {
    const trimmed = (reason ?? '').trim();
    if (!trimmed) {
      throw new BadRequestException('A reason is required.');
    }
    return trimmed;
  }

  private async requireRoute(routeId: number): Promise<RouteEntity> {
    const route = await this.routes.findOne({ where: { id: routeId } });
    if (!route) throw new NotFoundException(`No route ${routeId}.`);
    return route;
  }

  private label(route: RouteEntity): string {
    return route.name ?? `Route ${route.id}`;
  }
}

function describeWeekdays(days: number[]): string {
  return days.length === 0
    ? 'no days'
    : days.map((d) => WEEKDAY_NAMES[d]).join('/');
}
