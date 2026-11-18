import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  isScheduledOn,
  nextScheduledDate,
  weekdayOf,
  type RouteSchedule,
} from './route-schedule.service';
import { buildHarness, NOW, officer, TODAY } from './testing/harness';

// TODAY (2026-10-09) is a Friday.
const SUN = 0;
const MON = 1;
const TUE = 2;
const THU = 4;
const FRI = 5;
const SAT = 6;

const schedule = (
  weekdays: number[],
  overrides: RouteSchedule['overrides'] = [],
): RouteSchedule => ({ weekdays, overrides });

describe('schedule rules (pure)', () => {
  it('reads weekdays from the date string, 0 = Sunday', () => {
    expect(weekdayOf('2026-10-09')).toBe(FRI);
    expect(weekdayOf('2026-10-11')).toBe(SUN);
  });

  it('follows the weekly pattern', () => {
    const monThu = schedule([MON, THU]);
    expect(isScheduledOn(monThu, '2026-10-12')).toBe(true);
    expect(isScheduledOn(monThu, '2026-10-13')).toBe(false);
    expect(nextScheduledDate(monThu, TODAY)).toBe('2026-10-12');
  });

  it('is strictly after the starting date, even when that date is scheduled', () => {
    const monThu = schedule([MON, THU]);
    expect(nextScheduledDate(monThu, '2026-10-12')).toBe('2026-10-15');
    expect(nextScheduledDate(schedule([FRI]), TODAY)).toBe('2026-10-16');
  });

  it('lets a CANCEL override skip a pattern date', () => {
    const s = schedule([MON, THU], [{ date: '2026-10-12', kind: 'CANCEL' }]);
    expect(isScheduledOn(s, '2026-10-12')).toBe(false);
    expect(nextScheduledDate(s, TODAY)).toBe('2026-10-15');
  });

  it('lets an ADD override run on a day the pattern skips', () => {
    const s = schedule([MON, THU], [{ date: '2026-10-10', kind: 'ADD' }]);
    expect(nextScheduledDate(s, TODAY)).toBe('2026-10-10');
  });

  it('treats a move (CANCEL old + ADD new) as the new date', () => {
    const s = schedule(
      [MON, THU],
      [
        { date: '2026-10-12', kind: 'CANCEL' },
        { date: '2026-10-13', kind: 'ADD' },
      ],
    );
    expect(nextScheduledDate(s, TODAY)).toBe('2026-10-13');
  });

  it('returns null when the route never runs', () => {
    expect(nextScheduledDate(schedule([]), TODAY)).toBeNull();
    expect(
      nextScheduledDate(
        schedule([], [{ date: '2026-11-02', kind: 'ADD' }]),
        TODAY,
      ),
    ).toBe('2026-11-02');
  });
});

describe('RouteScheduleService', () => {
  function scenario() {
    const h = buildHarness();
    // Agent 1 holds two routes on different days; agent 2 holds route 3.
    h.permanent(1, 1);
    h.permanent(2, 1);
    h.permanent(3, 2);
    h.pattern(1, [MON, THU]);
    h.pattern(2, [TUE, FRI]);
    h.pattern(3, [MON, THU]);
    return h;
  }

  it('answers isScheduled / nextCollectionDay / scheduledRoutesOn from the stored schedule', async () => {
    const h = scenario();
    expect(await h.schedule.isScheduled(2, TODAY)).toBe(true);
    expect(await h.schedule.isScheduled(1, TODAY)).toBe(false);
    expect(await h.schedule.nextCollectionDay(1, TODAY)).toBe('2026-10-12');
    // route 4 keeps the harness default (every day)
    expect([...(await h.schedule.scheduledRoutesOn(TODAY))].sort()).toEqual([
      2, 4,
    ]);
  });

  it('lets one agent hold several permanent routes on different days', async () => {
    const h = scenario();
    expect(await h.schedule.agentClash(1, 1, TODAY)).toBeNull();
    expect(await h.schedule.agentClash(1, 2, TODAY)).toBeNull();
  });

  it('refuses a weekly pattern that puts an agent on two of his routes on one day', async () => {
    const h = scenario();
    await expect(
      h.schedule.setWeekdays(2, [TUE, THU], officer, NOW),
    ).rejects.toThrow(
      /R\. Senanayake would run both Route 2 and Route 1 on 2026-10-15/,
    );
    // a pattern that doesn't overlap is fine, and audited
    const view = await h.schedule.setWeekdays(2, [TUE, SAT], officer, NOW);
    expect(view.weekdays).toEqual([TUE, SAT]);
    expect(view.nextCollectionDay).toBe('2026-10-10');
    expect(h.audit.record).toHaveBeenCalledWith(
      officer,
      expect.objectContaining({
        action: 'Changed route weekly schedule',
        details: 'Tue/Fri → Tue/Sat',
      }),
    );
  });

  it('refuses an added date that clashes with the agent’s other route', async () => {
    const h = scenario();
    await expect(
      h.schedule.addOverride(
        1,
        { date: '2026-10-13', kind: 'ADD', reason: 'Extra pick' },
        officer,
        NOW,
      ),
    ).rejects.toThrow(ConflictException);
    // a different agent's route on that day is no clash
    const view = await h.schedule.addOverride(
      3,
      { date: '2026-10-13', kind: 'ADD', reason: 'Extra pick' },
      officer,
      NOW,
    );
    expect(view.upcoming.find((d) => d.date === '2026-10-13')).toEqual({
      date: '2026-10-13',
      scheduled: true,
      override: 'ADD',
    });
  });

  it('can check a reassignment before the agent holds the route (assumeHolds)', async () => {
    const h = scenario();
    // giving route 3 (Mon/Thu) to agent 1 would clash with his route 1 (Mon/Thu)
    expect(
      await h.schedule.agentClash(1, 3, TODAY, { assumeHolds: true }),
    ).toEqual({ date: '2026-10-12', otherRouteId: 1 });
  });

  it('cancels a date, and refuses un-scheduling today once collection started', async () => {
    const h = scenario();
    h.record({ routeId: 2, agentId: 1, kg: 40, status: 'collected' });
    await expect(
      h.schedule.addOverride(
        2,
        { date: TODAY, kind: 'CANCEL', reason: 'Rain' },
        officer,
        NOW,
      ),
    ).rejects.toThrow(/already started collecting today/);
    await expect(
      h.schedule.setWeekdays(2, [TUE], officer, NOW),
    ).rejects.toThrow(/already started collecting today/);

    const view = await h.schedule.addOverride(
      1,
      { date: '2026-10-12', kind: 'CANCEL', reason: 'Road closed' },
      officer,
      NOW,
    );
    expect(view.nextCollectionDay).toBe('2026-10-15');
  });

  it('cancels the cover held for a date that is taken off the schedule', async () => {
    const h = scenario();
    const cover = h.cover(2, 2, 'ACTIVE');
    await h.schedule.addOverride(
      2,
      { date: TODAY, kind: 'CANCEL', reason: 'Factory closed' },
      officer,
      NOW,
    );
    expect(cover.status).toBe('CANCELLED');
    expect(h.notifier.notifyAgent).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        type: 'cover_response',
        referenceId: cover.id,
      }),
    );
  });

  it('moves a date as one CANCEL + ADD pair, and removing either half restores both', async () => {
    const h = scenario();
    const moved = await h.schedule.moveDate(
      1,
      { fromDate: '2026-10-12', toDate: '2026-10-14', reason: 'Holiday' },
      officer,
      NOW,
    );
    expect(moved.nextCollectionDay).toBe('2026-10-14');
    expect(moved.overrides).toHaveLength(2);
    expect(moved.overrides[0].moveGroup).toBe(moved.overrides[1].moveGroup);

    const restored = await h.schedule.removeOverride(
      1,
      moved.overrides[1].id,
      officer,
      NOW,
    );
    expect(restored.overrides).toHaveLength(0);
    expect(restored.nextCollectionDay).toBe('2026-10-12');
  });

  it('validates dates, reasons and duplicate overrides', async () => {
    const h = scenario();
    await expect(
      h.schedule.addOverride(
        1,
        { date: '2026-10-01', kind: 'ADD', reason: 'x' },
        officer,
        NOW,
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      h.schedule.addOverride(
        1,
        { date: '2026-10-12', kind: 'ADD', reason: 'x' },
        officer,
        NOW,
      ),
    ).rejects.toThrow(/already runs on 2026-10-12/);
    await expect(
      h.schedule.addOverride(
        1,
        { date: '2026-10-13', kind: 'CANCEL', reason: 'x' },
        officer,
        NOW,
      ),
    ).rejects.toThrow(/nothing to cancel/);
    await expect(
      h.schedule.addOverride(
        1,
        { date: '2026-10-12', kind: 'CANCEL', reason: '  ' },
        officer,
        NOW,
      ),
    ).rejects.toThrow(/reason is required/);

    await h.schedule.addOverride(
      1,
      { date: '2026-10-12', kind: 'CANCEL', reason: 'Rain' },
      officer,
      NOW,
    );
    await expect(
      h.schedule.moveDate(
        1,
        { fromDate: '2026-10-15', toDate: '2026-10-12', reason: 'x' },
        officer,
        NOW,
      ),
    ).rejects.toThrow(/Remove it first/);
    await expect(h.schedule.view(99, NOW)).rejects.toThrow(NotFoundException);
  });
});
