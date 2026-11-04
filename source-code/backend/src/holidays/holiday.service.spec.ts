import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AuditService } from '../audit/audit.service';
import type { DispatchAccessService } from '../dispatch/dispatch-access.service';
import type { DispatchNotifier } from '../dispatch/dispatch-notifier.service';
import type { RouteResolverService } from '../dispatch/route-resolver.service';
import type { RouteScheduleService } from '../dispatch/route-schedule.service';
import type { FertilizerDeliveryService } from '../fertilizer/fertilizer-delivery.service';
import { HolidayService } from './holiday.service';

function fake<T extends object>(rows: T[] = []) {
  let seq = 1;
  const match = (r: T, where?: Partial<T>) =>
    !where ||
    Object.entries(where).every(
      ([k, v]) => (r as Record<string, unknown>)[k] === v,
    );
  return {
    rows,
    find: (o?: { where?: Partial<T> }) =>
      Promise.resolve(rows.filter((r) => match(r, o?.where))),
    findOne: (o: { where: Partial<T> }) =>
      Promise.resolve(rows.find((r) => match(r, o.where)) ?? null),
    create: (p: Partial<T>) => ({ ...p }) as T,
    save: (r: T) => {
      const x = r as { id?: number };
      if (x.id === undefined) x.id = seq++;
      if (!rows.includes(r)) rows.push(r);
      return Promise.resolve(r);
    },
    delete: (w: { id: number }) => {
      const i = rows.findIndex((r) => (r as { id?: number }).id === w.id);
      if (i >= 0) rows.splice(i, 1);
      return Promise.resolve({ affected: i >= 0 ? 1 : 0 });
    },
  };
}

const NOW = new Date('2026-11-10T06:00:00Z');
const manager = { name: 'M. Gunawardena', role: 'Manager' as const };
const officer = { name: 'S. Fernando', role: 'Officer' as const };

function setup() {
  const holidays = fake<never>();
  const attendance = fake([
    {
      id: 1,
      employeeId: 2,
      date: '2026-11-12',
      status: 'Present',
      holidayWorked: false,
      leaveRequestId: null,
    },
    {
      id: 2,
      employeeId: 3,
      date: '2026-11-12',
      status: 'Absent',
      holidayWorked: false,
      leaveRequestId: null,
    },
  ]);
  const employees = fake([
    { id: 2, name: 'N. Silva', category: 'factory' },
    { id: 3, name: 'T. Rajapaksa', category: 'factory' },
  ]);
  const schedule = {
    scheduledRoutesOn: jest.fn().mockResolvedValue(new Set([3])),
    addOverride: jest.fn().mockResolvedValue(undefined),
    removeOverride: jest.fn().mockResolvedValue(undefined),
  };
  const deliveries = { reconcile: jest.fn().mockResolvedValue(undefined) };
  const notifier = { notifyAgent: jest.fn().mockResolvedValue(undefined) };
  const access = {
    require: jest.fn((role: string) =>
      role === 'Manager'
        ? Promise.resolve()
        : Promise.reject(
            new ForbiddenException(
              'Your role may not change the holiday calendar.',
            ),
          ),
    ),
  };
  const service = new HolidayService(
    holidays as unknown as Repository<never>,
    fake() as unknown as Repository<never>,
    fake() as unknown as Repository<never>,
    fake() as unknown as Repository<never>,
    attendance as unknown as Repository<never>,
    employees as unknown as Repository<never>,
    fake([{ id: 3, name: 'Route 3' }]) as unknown as Repository<never>,
    fake() as unknown as Repository<never>,
    access as unknown as DispatchAccessService,
    schedule as unknown as RouteScheduleService,
    {
      getAgentForRoute: jest.fn().mockResolvedValue({ agentId: 9 }),
    } as unknown as RouteResolverService,
    notifier as unknown as DispatchNotifier,
    deliveries as unknown as FertilizerDeliveryService,
    {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditService,
  );
  return { service, holidays, attendance, schedule, deliveries, notifier };
}

const flood = {
  from: '2026-11-12',
  to: '2026-11-12',
  name: 'Flood closure',
  reason: 'Road under water',
  paid: false,
  appliesTo: 'all' as const,
  collectionStops: true,
};

describe('HolidayService', () => {
  it('only the Factory Manager (holidayCalendar: edit) may change holidays — enforced on the server', async () => {
    const { service } = setup();
    await expect(
      service.create(
        { date: '2026-12-24', name: 'Unduvap Poya', type: 'poya' },
        officer,
      ),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.create(
        { date: '2026-12-24', name: 'Unduvap Poya', type: 'poya' },
        manager,
      ),
    ).resolves.toMatchObject({
      name: 'Unduvap Poya',
      paid: true,
    });
  });

  it('declaring over marked attendance asks keep or clear first', async () => {
    const { service } = setup();
    const p = await service.declarePreview(flood);
    expect(p.attendance.map((a) => a.status)).toEqual(['Present', 'Absent']);
    await expect(service.declare(flood, manager, NOW)).rejects.toThrow(
      ConflictException,
    );
  });

  it('keep: Present becomes Worked on holiday, Absent is cleared; routes cancelled, deliveries moved, agents told', async () => {
    const { service, attendance, schedule, deliveries, notifier, holidays } =
      setup();
    await service.declare({ ...flood, attendance: 'keep' }, manager, NOW);
    expect(attendance.rows).toHaveLength(1);
    expect(attendance.rows[0]).toMatchObject({
      employeeId: 2,
      holidayWorked: true,
    });
    expect(schedule.addOverride).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ date: '2026-11-12', kind: 'CANCEL' }),
      manager,
      NOW,
    );
    expect(deliveries.reconcile).toHaveBeenCalled();
    expect(notifier.notifyAgent).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ type: 'holiday_declared' }),
    );
    expect(holidays.rows[0]).toMatchObject({
      type: 'closure',
      paid: false,
      workAllowed: false,
    });
  });

  it('collection continues (office only): routes stay as they are', async () => {
    const { service, schedule } = setup();
    await service.declare(
      {
        ...flood,
        appliesTo: 'office',
        collectionStops: false,
        attendance: 'clear',
      },
      manager,
      NOW,
    );
    expect(schedule.addOverride).not.toHaveBeenCalled();
  });

  it('weekly rules apply from today on — never to past weeks', async () => {
    const { service } = setup();
    await expect(
      service.setWeeklyRule(
        {
          category: 'factory',
          weekdays: [0],
          halfDayWeekday: 6,
          effectiveFrom: '2026-11-01',
        },
        manager,
        NOW,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('a declared holiday that has started needs a reason to cancel', async () => {
    const { service } = setup();
    const { group } = await service.declare(
      { ...flood, attendance: 'keep' },
      manager,
      NOW,
    );
    await expect(
      service.cancelDeclared(
        group,
        undefined,
        manager,
        new Date('2026-11-12T06:00:00Z'),
      ),
    ).rejects.toThrow(/reason is required/);
  });
});
