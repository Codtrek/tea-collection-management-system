import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { PermissionLevel } from '../admin/admin-map';
import type { AuditService } from '../audit/audit.service';
import type { DispatchAccessService } from '../dispatch/dispatch-access.service';
import type { DispatchNotifier } from '../dispatch/dispatch-notifier.service';
import type { RouteResolverService } from '../dispatch/route-resolver.service';
import type { RouteScheduleService } from '../dispatch/route-schedule.service';
import type { FertilizerDeliveryService } from '../fertilizer/fertilizer-delivery.service';
import { HolidayService } from './holiday.service';

function fake<T extends object>(rows: T[] = []) {
  let seq = 100;
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

const NOW = new Date('2026-11-10T06:00:00Z'); // 10 Nov, factory time
const admin = { name: 'A. Perera', role: 'Administrator' as const, sub: 1 };
const manager = { name: 'M. Gunawardena', role: 'Manager' as const, sub: 3 };
const officer = { name: 'S. Fernando', role: 'Officer' as const, sub: 2 };

// the seeded role_permissions rows
const LEVELS: Record<string, Record<string, PermissionLevel>> = {
  Administrator: { holidayCalendar: 'approve', holidayStatutory: 'approve' },
  Manager: { holidayCalendar: 'edit', holidayStatutory: 'view' },
  Officer: { holidayCalendar: 'view', holidayStatutory: 'view' },
};

function setup(opts: { attendanceDate?: string } = {}) {
  const date = opts.attendanceDate ?? '2026-11-12';
  const holidays = fake<never>();
  const weekly = fake<never>();
  const requests = fake<never>();
  const overrides = fake<{
    id?: number;
    routeId: number;
    date: string;
    kind: string;
    reason: string;
  }>();
  const payroll = fake<{
    employeeId: number;
    period: string;
    status: string;
  }>();
  const attendance = fake([
    {
      id: 1,
      employeeId: 2,
      date,
      status: 'Present',
      holidayWorked: false,
      editReason: null,
      leaveRequestId: null,
    },
    {
      id: 2,
      employeeId: 3,
      date,
      status: 'Absent',
      holidayWorked: false,
      editReason: null,
      leaveRequestId: null,
    },
  ]);
  const employees = fake([
    { id: 2, name: 'N. Silva', category: 'factory' },
    { id: 3, name: 'T. Rajapaksa', category: 'factory' },
  ]);
  const schedule = {
    scheduledRoutesOn: jest.fn().mockResolvedValue(new Set([3])),
    addOverride: jest.fn(
      (routeId: number, o: { date: string; kind: string; reason: string }) =>
        overrides.save({ routeId, ...o }),
    ),
    removeOverride: jest.fn().mockResolvedValue(undefined),
  };
  const deliveries = { reconcile: jest.fn().mockResolvedValue(undefined) };
  const notifier = {
    notifyAgent: jest.fn().mockResolvedValue(undefined),
    notifyUser: jest.fn().mockResolvedValue(undefined),
  };
  const access = {
    levelFor: jest.fn((role: string, module: string) =>
      Promise.resolve(LEVELS[role]?.[module] ?? 'none'),
    ),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new HolidayService(
    holidays as unknown as Repository<never>,
    fake() as unknown as Repository<never>,
    weekly as unknown as Repository<never>,
    fake() as unknown as Repository<never>,
    attendance as unknown as Repository<never>,
    employees as unknown as Repository<never>,
    fake([{ id: 3, name: 'Route 3' }]) as unknown as Repository<never>,
    overrides as unknown as Repository<never>,
    access as unknown as DispatchAccessService,
    schedule as unknown as RouteScheduleService,
    {
      getAgentForRoute: jest.fn().mockResolvedValue({ agentId: 9 }),
    } as unknown as RouteResolverService,
    notifier as unknown as DispatchNotifier,
    deliveries as unknown as FertilizerDeliveryService,
    audit as unknown as AuditService,
    requests as unknown as Repository<never>,
    payroll as unknown as Repository<never>,
    fake([
      { id: 1, role: 'factory_admin', status: 'active' },
      { id: 3, role: 'factory_manager', status: 'active' },
    ]) as unknown as Repository<never>,
  );
  return {
    service,
    holidays,
    weekly,
    requests,
    payroll,
    attendance,
    schedule,
    deliveries,
    notifier,
    audit,
  };
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
const staffDay = {
  ...flood,
  name: 'Office outing',
  reason: 'Annual trip',
  appliesTo: 'office' as const,
  collectionStops: false,
};

describe('HolidayService', () => {
  it('Poya / public holidays are the Administrator’s (holidayStatutory) — enforced on the server', async () => {
    const { service } = setup();
    const poya = {
      date: '2026-12-23',
      name: 'Unduvap Poya',
      type: 'poya' as const,
    };
    await expect(service.create(poya, officer)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.create(poya, manager)).rejects.toThrow(
      /Administrator/,
    );
    await expect(service.create(poya, admin)).resolves.toMatchObject({
      name: 'Unduvap Poya',
      paid: true,
      source: 'manual',
    });
    await expect(
      service.updateType('weekly', { paid: true, workAllowed: true }, manager),
    ).rejects.toThrow(ForbiddenException);
  });

  it('declaring over marked attendance asks keep or clear first', async () => {
    const { service } = setup();
    const p = await service.declarePreview(flood);
    expect(p.attendance.map((a) => a.status)).toEqual(['Present', 'Absent']);
    await expect(service.declare(flood, admin, NOW)).rejects.toThrow(
      ConflictException,
    );
  });

  it('keep: Present becomes Worked on holiday, Absent is cleared; routes cancelled, deliveries moved, agents told', async () => {
    const { service, attendance, schedule, deliveries, notifier, holidays } =
      setup();
    const r = await service.declare(
      { ...flood, attendance: 'keep' },
      admin,
      NOW,
    );
    expect(r.status).toBe('applied');
    expect(attendance.rows).toHaveLength(1);
    expect(attendance.rows[0]).toMatchObject({
      employeeId: 2,
      holidayWorked: true,
    });
    expect(schedule.addOverride).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ date: '2026-11-12', kind: 'CANCEL' }),
      admin,
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
      createdByUserId: 1,
    });
  });

  it('a Manager’s category holiday applies at once; collection continues for an office day', async () => {
    const { service, schedule, holidays } = setup();
    const r = await service.declare(
      { ...staffDay, attendance: 'clear' },
      manager,
      NOW,
    );
    expect(r.status).toBe('applied');
    expect(holidays.rows).toHaveLength(1);
    expect(schedule.addOverride).not.toHaveBeenCalled();
  });

  it('an Officer may not declare anything', async () => {
    const { service } = setup();
    await expect(
      service.declare({ ...staffDay, attendance: 'clear' }, officer, NOW),
    ).rejects.toThrow(ForbiddenException);
  });

  describe('a pending request has no effect until the Administrator approves it', () => {
    it('factory-wide closure from a Manager', async () => {
      const { service, attendance, schedule, notifier, requests, audit } =
        setup();
      const r = await service.declare(
        { ...flood, attendance: 'keep' },
        manager,
        NOW,
      );
      expect(r.status).toBe('pending');

      // nothing moved: no holiday for attendance / leave / payroll, no routes, attendance as it was
      expect(
        (await service.facts('2026-11-12', '2026-11-12')).holidays,
      ).toEqual([]);
      expect(
        (await service.dayFor('2026-11-12', { id: 2, category: 'factory' }))
          .type,
      ).toBe('working');
      expect(schedule.addOverride).not.toHaveBeenCalled();
      expect(attendance.rows.map((a) => a.holidayWorked)).toEqual([
        false,
        false,
      ]);
      // the Administrator is told; it's audited
      expect(notifier.notifyUser).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ type: 'holiday_request' }),
      );
      expect(notifier.notifyUser).not.toHaveBeenCalledWith(
        3,
        expect.anything(),
      );
      expect(audit.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({ action: 'Requested a factory closure' }),
      );
      // the calendar shows it as awaiting approval
      const y = await service.year(2026, manager, NOW);
      expect(y.pending).toEqual([
        expect.objectContaining({
          kind: 'closure',
          name: 'Flood closure',
          status: 'pending',
        }),
      ]);

      // a Manager can't approve it; the Administrator needs a reason
      const id = (requests.rows[0] as { id: number }).id;
      await expect(
        service.decideRequest(id, 'approve', 'ok', manager, NOW),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.decideRequest(id, 'approve', '  ', admin, NOW),
      ).rejects.toThrow(BadRequestException);

      await service.decideRequest(
        id,
        'approve',
        'Confirmed with the RDA',
        admin,
        NOW,
      );
      expect(
        (await service.facts('2026-11-12', '2026-11-12')).holidays,
      ).toHaveLength(1);
      expect(schedule.addOverride).toHaveBeenCalled();
      expect(attendance.rows[0]).toMatchObject({ holidayWorked: true });
      expect(requests.rows[0]).toMatchObject({
        status: 'approved',
        decidedBy: 'A. Perera',
        decisionReason: 'Confirmed with the RDA',
      });
      // the requester stays the holiday's creator, and hears back
      expect(
        (await service.year(2026, manager, NOW)).holidays[0],
      ).toMatchObject({ createdBy: 'M. Gunawardena' });
      expect(notifier.notifyUser).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ type: 'holiday_request' }),
      );
      await expect(
        service.decideRequest(id, 'reject', 'again', admin, NOW),
      ).rejects.toThrow(ConflictException);
    });

    it('weekly holiday proposal from a Manager', async () => {
      const { service, weekly, requests } = setup();
      const r = await service.setWeeklyRule(
        { category: 'factory', weekdays: [0, 6], effectiveFrom: '2026-11-15' },
        manager,
        NOW,
      );
      expect(r.status).toBe('pending');
      expect(weekly.rows).toHaveLength(0);

      // approved after its date has passed: it applies from the approval day
      const id = (requests.rows[0] as { id: number }).id;
      await service.decideRequest(
        id,
        'approve',
        'Agreed with the union',
        admin,
        new Date('2026-11-17T06:00:00Z'),
      );
      expect(weekly.rows[0]).toMatchObject({
        category: 'factory',
        weekdays: [0, 6],
        effectiveFrom: '2026-11-17',
        createdBy: 'M. Gunawardena',
      });
    });

    it('a rejected request leaves everything as it was', async () => {
      const { service, weekly, requests } = setup();
      await service.setWeeklyRule(
        { category: 'office', weekdays: [0, 6], effectiveFrom: '2026-11-15' },
        manager,
        NOW,
      );
      const id = (requests.rows[0] as { id: number }).id;
      await service.decideRequest(id, 'reject', 'Not this year', admin, NOW);
      expect(weekly.rows).toHaveLength(0);
      expect(requests.rows[0]).toMatchObject({ status: 'rejected' });
    });

    it('the Administrator sets the weekly holiday directly', async () => {
      const { service, weekly } = setup();
      const r = await service.setWeeklyRule(
        { category: 'factory', weekdays: [0], effectiveFrom: '2026-11-15' },
        admin,
        NOW,
      );
      expect(r.status).toBe('applied');
      expect(weekly.rows).toHaveLength(1);
    });
  });

  describe('emergency closure (today only)', () => {
    const today = {
      ...flood,
      from: '2026-11-10',
      to: '2026-11-10',
      emergency: true,
      attendance: 'clear' as const,
    };

    it('is for today only', async () => {
      const { service } = setup({ attendanceDate: '2026-11-10' });
      await expect(
        service.declare({ ...today, to: '2026-11-11' }, manager, NOW),
      ).rejects.toThrow(/today only/);
    });

    it('takes effect immediately; the Administrator’s revert undoes it', async () => {
      const s = setup({ attendanceDate: '2026-11-10' });
      const r = await s.service.declare(today, manager, NOW);
      expect(r.status).toBe('review');

      // in force now: a holiday, attendance cleared, the route cancelled, the Administrator told
      expect(
        (await s.service.facts('2026-11-10', '2026-11-10')).holidays,
      ).toHaveLength(1);
      expect(s.attendance.rows).toHaveLength(0);
      expect(s.schedule.addOverride).toHaveBeenCalledTimes(1);
      const [toUser, note] = s.notifier.notifyUser.mock.calls[0] as [
        number,
        { title: string },
      ];
      expect(toUser).toBe(1);
      expect(note.title).toMatch(/Emergency closure to review/);

      const id = (s.requests.rows[0] as { id: number }).id;
      await s.service.decideRequest(
        id,
        'reject',
        'Road reopened by 9am',
        admin,
        NOW,
      );

      expect(
        (await s.service.facts('2026-11-10', '2026-11-10')).holidays,
      ).toEqual([]);
      expect(
        s.attendance.rows.map((a) => [a.id, a.status, a.holidayWorked]),
      ).toEqual([
        [1, 'Present', false],
        [2, 'Absent', false],
      ]);
      expect(s.schedule.removeOverride).toHaveBeenCalledWith(
        3,
        expect.any(Number),
        admin,
        NOW,
      );
      expect(s.deliveries.reconcile).toHaveBeenCalledTimes(2);
      expect(s.notifier.notifyAgent).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ type: 'holiday_cancelled' }),
      );
      expect(s.requests.rows[0]).toMatchObject({ status: 'reverted' });
    });

    it('keep closes the review and leaves the closure in force', async () => {
      const s = setup({ attendanceDate: '2026-11-10' });
      await s.service.declare(today, manager, NOW);
      const id = (s.requests.rows[0] as { id: number }).id;
      await s.service.decideRequest(id, 'approve', 'Right call', admin, NOW);
      expect(s.requests.rows[0]).toMatchObject({ status: 'kept' });
      expect(
        (await s.service.facts('2026-11-10', '2026-11-10')).holidays,
      ).toHaveLength(1);
    });
  });

  describe('a Manager changes only their own future holidays with no processed payroll', () => {
    it('not someone else’s', async () => {
      const { service } = setup();
      await service.declare({ ...staffDay, attendance: 'clear' }, admin, NOW);
      const [h] = (await service.year(2026, manager, NOW)).holidays;
      expect(h.canChange).toBe(false);
      await expect(
        service.cancel(h.id, undefined, manager, NOW),
      ).rejects.toThrow(/you created/);
    });

    it('not a past one', async () => {
      const { service } = setup();
      await service.declare({ ...staffDay, attendance: 'clear' }, manager, NOW);
      const [h] = (await service.year(2026, manager, NOW)).holidays;
      expect(h.canChange).toBe(true);
      await expect(
        service.cancel(h.id, 'late', manager, new Date('2026-11-13T06:00:00Z')),
      ).rejects.toThrow(/future/);
    });

    it('not one covering processed payroll', async () => {
      const { service, payroll } = setup();
      // a factory-workers holiday; one of them already has a processed November payroll
      payroll.rows.push({
        employeeId: 2,
        period: 'November 2026',
        status: 'Processed',
      });
      await service.declare(
        { ...staffDay, appliesTo: 'factory', attendance: 'clear' },
        manager,
        NOW,
      );
      const [h] = (await service.year(2026, manager, NOW)).holidays;
      await expect(
        service.cancel(h.id, undefined, manager, NOW),
      ).rejects.toThrow(/Payroll/);
    });

    it('their own future one, yes; the Administrator any', async () => {
      const { service } = setup();
      await service.declare({ ...staffDay, attendance: 'clear' }, manager, NOW);
      const [h] = (await service.year(2026, manager, NOW)).holidays;
      await expect(
        service.cancel(h.id, undefined, manager, NOW),
      ).resolves.toBeUndefined();
      await service.declare({ ...staffDay, attendance: 'clear' }, manager, NOW);
      const live = (await service.year(2026, admin, NOW)).holidays.filter(
        (x) => !x.cancelled,
      );
      expect(live[0].canChange).toBe(true);
    });
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
        admin,
        NOW,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('a declared holiday that has started needs a reason to cancel', async () => {
    const { service } = setup();
    const r = await service.declare(
      { ...flood, attendance: 'keep' },
      admin,
      NOW,
    );
    await expect(
      service.cancelDeclared(
        r.group!,
        undefined,
        admin,
        new Date('2026-11-12T06:00:00Z'),
      ),
    ).rejects.toThrow(/reason is required/);
  });
});
