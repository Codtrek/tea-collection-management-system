import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { SystemSettingEntity } from '../admin/system-setting.entity';
import type { AuditService } from '../audit/audit.service';
import type { DispatchAccessService } from '../dispatch/dispatch-access.service';
import type { DispatchService } from '../dispatch/dispatch.service';
import type { HolidayService } from '../holidays/holiday.service';
import { type CalendarFacts, DEFAULT_TYPES } from '../holidays/working-days';
import { AttendanceService } from './attendance.service';
import type { EmployeeAttendanceEntity } from './employee-attendance.entity';
import type { EmployeeRoutesService } from './employee-routes.service';
import type { EmployeeEntity } from './employee.entity';
import type { Actor } from './employees.service';
import type { PayrollRunEntity } from './payroll-run.entity';

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
  };
}

const emp = (
  id: number,
  name: string,
  category: 'factory' | 'office' = 'factory',
) =>
  ({
    id,
    name,
    role: 'Machine Operator',
    category,
    status: 'Active',
    deactivatedOn: null,
  }) as EmployeeEntity;

const officer: Actor = { name: 'S. Fernando', role: 'Officer' };
const manager: Actor = { name: 'M. Gunawardena', role: 'Manager' };
const NOW = new Date('2026-11-10T06:00:00Z'); // factory day 10 Nov 2026 (a Tuesday)

const facts: CalendarFacts = {
  holidays: [
    {
      date: '2026-11-09',
      name: 'Test Poya',
      type: 'poya',
      paid: true,
      workAllowed: true,
      appliesTo: 'all',
    },
  ],
  weekly: [
    {
      category: 'factory',
      weekdays: [0],
      halfDayWeekday: null,
      effectiveFrom: '2000-01-01',
    },
    {
      category: 'office',
      weekdays: [0],
      halfDayWeekday: null,
      effectiveFrom: '2000-01-01',
    },
  ],
  restDays: [],
  types: DEFAULT_TYPES,
};

function setup(payroll: Partial<PayrollRunEntity>[] = []) {
  const attendance = fake<EmployeeAttendanceEntity>();
  const employees = fake<EmployeeEntity>([
    emp(1, 'N. Silva'),
    emp(7, 'R. Senanayake'),
  ]);
  const sync = jest.fn().mockResolvedValue(undefined);
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const levels: Record<string, string> = {
    Officer: 'edit',
    Manager: 'approve',
  };
  const service = new AttendanceService(
    attendance as unknown as Repository<EmployeeAttendanceEntity>,
    employees as unknown as Repository<EmployeeEntity>,
    fake(
      payroll as PayrollRunEntity[],
    ) as unknown as Repository<PayrollRunEntity>,
    fake<SystemSettingEntity>([
      {
        key: 'attendance',
        value: { editWindowDays: 3 },
      } as SystemSettingEntity,
    ]) as unknown as Repository<SystemSettingEntity>,
    { facts: () => Promise.resolve(facts) } as unknown as HolidayService,
    { syncFromAttendance: sync } as unknown as DispatchService,
    {
      routesByEmployee: () => Promise.resolve(new Map()),
      routes: () => Promise.resolve([]),
    } as unknown as EmployeeRoutesService,
    {
      levelFor: (role: string) => Promise.resolve(levels[role] ?? 'view'),
    } as unknown as DispatchAccessService,
    audit as unknown as AuditService,
  );
  return { service, attendance, sync, audit };
}

const mark = (date: string, status: string, more: object = {}) => ({
  date,
  records: [{ employeeId: 'EMP-0001', status, ...more }],
});

describe('AttendanceService.mark', () => {
  it('rejects a future date', async () => {
    const { service } = setup();
    await expect(
      service.mark(mark('2026-11-11', 'Present') as never, officer, NOW),
    ).rejects.toThrow(BadRequestException);
  });

  it('an Officer can’t mark beyond the window; the Manager can, with a reason (audited)', async () => {
    const { service, attendance, audit } = setup();
    await expect(
      service.mark(mark('2026-11-05', 'Present') as never, officer, NOW),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.mark(mark('2026-11-05', 'Present') as never, manager, NOW),
    ).rejects.toThrow(/reason is required/);
    await service.mark(
      {
        ...mark('2026-11-05', 'Present'),
        reason: 'Paper register found',
      } as never,
      manager,
      NOW,
    );
    expect(attendance.rows[0]).toMatchObject({
      status: 'Present',
      editReason: 'Paper register found',
      markedBy: manager.name,
    });
    const [[, entry]] = audit.record.mock.calls as [
      [unknown, { details?: string }],
    ];
    expect(entry.details).toMatch(/Paper register found/);
  });

  it('a Processed payroll month is locked for that employee', async () => {
    const { service } = setup([
      { employeeId: 1, period: 'November 2026', status: 'Processed' },
    ]);
    await expect(
      service.mark(mark('2026-11-10', 'Present') as never, officer, NOW),
    ).rejects.toThrow(/payroll is processed/);
  });

  it('a Poya day can’t be Absent; Present there is Worked on holiday', async () => {
    const { service, attendance } = setup();
    await expect(
      service.mark(mark('2026-11-09', 'Absent') as never, officer, NOW),
    ).rejects.toThrow(ConflictException);
    await service.mark(mark('2026-11-09', 'Present') as never, officer, NOW);
    expect(attendance.rows[0]).toMatchObject({
      holidayWorked: true,
      dayHours: '8',
    });
  });

  it('stores who marked it and when, and tells dispatch (one record, two views)', async () => {
    const { service, attendance, sync } = setup();
    await service.mark(
      {
        date: '2026-11-10',
        records: [{ employeeId: 'EMP-0007', status: 'Absent' }],
      } as never,
      officer,
      NOW,
    );
    expect(attendance.rows[0]).toMatchObject({
      employeeId: 7,
      status: 'Absent',
      markedBy: officer.name,
      source: 'portal',
    });
    expect(attendance.rows[0].markedAt).toEqual(NOW);
    expect(sync).toHaveBeenCalledWith(
      7,
      '2026-11-10',
      'Absent',
      officer.name,
      NOW,
    );
  });
});

describe('AttendanceService views', () => {
  it('the month grid: future days empty, holidays labelled, totals per employee', async () => {
    const { service, attendance } = setup();
    attendance.rows.push({
      employeeId: 1,
      date: '2026-11-10',
      status: 'Present',
      holidayWorked: false,
    } as EmployeeAttendanceEntity);
    const m = await service.month('2026-11', {}, NOW);
    expect(m.days).toHaveLength(30);
    expect(m.days.find((d) => d.date === '2026-11-09')).toMatchObject({
      dayType: 'poya',
      label: 'Test Poya',
    });
    expect(m.days.find((d) => d.date === '2026-11-10')).toMatchObject({
      today: true,
      future: false,
    });
    expect(m.days.find((d) => d.date === '2026-11-11')?.future).toBe(true);
    const silva = m.rows.find((r) => r.name === 'N. Silva')!;
    expect(silva.cells.find((c) => c.date === '2026-11-10')?.code).toBe('P');
    expect(silva.totals.present).toBe(1);
    expect(
      (await service.month('2026-11', { unmarked: true }, NOW)).rows.length,
    ).toBe(2);
  });

  it('the day view: no one defaults to Present', async () => {
    const { service } = setup();
    const d = await service.day('2026-11-10', null, NOW);
    expect(d.rows.every((r) => r.status === null)).toBe(true);
    expect(d.summary.notMarked).toBe(2);
  });
});
