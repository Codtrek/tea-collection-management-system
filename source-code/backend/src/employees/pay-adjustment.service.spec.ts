import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { PermissionLevel } from '../admin/admin-map';
import type { AuditService } from '../audit/audit.service';
import type { DispatchAccessService } from '../dispatch/dispatch-access.service';
import type { PayAdjustmentDto } from './dto/pay-adjustment.dto';
import type { EmployeeAttendanceEntity } from './employee-attendance.entity';
import type { EmployeeEntity } from './employee.entity';
import type { Actor } from './employees.service';
import type { PayAdjustmentEntity } from './pay-adjustment.entity';
import { PayAdjustmentService } from './pay-adjustment.service';
import type { PayRateEntity } from './pay-rate.entity';
import type { PayRatesService } from './pay-rates.service';
import { toPayVersion } from './pay-resolution';
import type { PayrollRunEntity } from './payroll-run.entity';
import {
  DEFAULT_PAYROLL_SETTINGS,
  type PayrollSettingsService,
} from './payroll-settings.service';

/** Pay adjustments — prepare, approve, reject (Administration-Addendum §8). */

const NOW = new Date('2026-11-15T04:00:00Z');
const LEVELS: Record<string, PermissionLevel> = {
  Administrator: 'approve',
  Manager: 'edit',
  Officer: 'none',
};
const ORDER: PermissionLevel[] = ['none', 'view', 'edit', 'approve'];
const access = {
  levelFor: (role: string) => Promise.resolve(LEVELS[role] ?? 'none'),
  require: (role: string, needed: PermissionLevel, what: string) =>
    ORDER.indexOf(LEVELS[role] ?? 'none') < ORDER.indexOf(needed)
      ? Promise.reject(new ForbiddenException(`Your role may not ${what}.`))
      : Promise.resolve(),
};

const manager: Actor = {
  name: 'R. Jayasuriya',
  role: 'Manager',
  sub: 3,
  nic: '198011112222',
};
const admin: Actor = {
  name: 'A. Bandara',
  role: 'Administrator',
  sub: 1,
  nic: '197512345678',
};

const employee = (o: Partial<EmployeeEntity>): EmployeeEntity =>
  ({
    id: 2,
    name: 'N. Silva',
    nic: '199523456789',
    role: 'Machine Operator',
    category: 'factory',
    status: 'Active',
    ...o,
  }) as EmployeeEntity;

function build() {
  const adjustments: PayAdjustmentEntity[] = [];
  const rates: PayRateEntity[] = [
    {
      id: 1,
      scope: 'role',
      role: 'Machine Operator',
      employeeId: null,
      effectiveDate: '2019-01-01',
      dayRate: '400',
      dayOtRate: '600',
      nightRate: '480',
      nightOtRate: '720',
      reason: 'r',
      setBy: 's',
      source: 'migration',
      adjustmentId: null,
    } as PayRateEntity,
    {
      id: 2,
      scope: 'employee',
      role: null,
      employeeId: 6,
      effectiveDate: '2019-01-01',
      dayRate: '450',
      dayOtRate: '675',
      nightRate: '540',
      nightOtRate: '810',
      reason: 'r',
      setBy: 's',
      source: 'migration',
      adjustmentId: null,
    } as PayRateEntity,
  ];
  const people = [
    employee({}),
    employee({ id: 6, name: 'D. Wijesinghe', nic: '197512345678' }), // the Administrator's NIC
    employee({ id: 4, name: 'P. Kumara', nic: '199011112222', role: 'Driver' }),
  ];
  const runs: Partial<PayrollRunEntity>[] = [];
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const refreshCache = jest.fn().mockResolvedValue(undefined);
  let seq = 0;
  const service = new PayAdjustmentService(
    {
      create: (p: Partial<PayAdjustmentEntity>) => ({ ...p }),
      save: (a: PayAdjustmentEntity) => {
        a.id ??= ++seq;
        const i = adjustments.findIndex((x) => x.id === a.id);
        if (i >= 0) adjustments[i] = a;
        else adjustments.push(a);
        return Promise.resolve(a);
      },
      findOne: ({ where }: { where: { id: number } }) =>
        Promise.resolve(adjustments.find((a) => a.id === where.id) ?? null),
      find: () => Promise.resolve([...adjustments]),
    } as unknown as Repository<PayAdjustmentEntity>,
    {
      create: (p: Partial<PayRateEntity>) => ({ ...p }),
      save: (rows: PayRateEntity[]) => {
        rows.forEach((r) => rates.push({ ...r, id: rates.length + 1 }));
        return Promise.resolve(rows);
      },
    } as unknown as Repository<PayRateEntity>,
    {
      find: () => Promise.resolve(people),
    } as unknown as Repository<EmployeeEntity>,
    {
      find: () =>
        Promise.resolve([
          {
            employeeId: 2,
            date: '2026-10-05',
            dayHours: '160',
            dayOtHours: '10',
            nightHours: '0',
            nightOtHours: '0',
          },
        ]),
    } as unknown as Repository<EmployeeAttendanceEntity>,
    {
      find: () => Promise.resolve(runs),
    } as unknown as Repository<PayrollRunEntity>,
    {
      versions: () => Promise.resolve(rates.map((r) => toPayVersion(r))),
      refreshCache,
    } as unknown as PayRatesService,
    {
      get: () => Promise.resolve({ ...DEFAULT_PAYROLL_SETTINGS }),
    } as unknown as PayrollSettingsService,
    access as unknown as DispatchAccessService,
    audit as unknown as AuditService,
  );
  return { service, rates, runs, audit, refreshCache };
}

const raise: PayAdjustmentDto = {
  scope: 'role',
  role: 'Machine Operator',
  direction: 'increase',
  kind: 'percent',
  amount: 5,
  rounding: 0,
  effectiveDate: '2026-12-01',
  reason: 'Annual increment',
};

describe('PayAdjustmentService', () => {
  it('the Manager prepares; nothing changes in pay history until it is approved', async () => {
    const h = build();
    const adj = await h.service.prepare(raise, manager, NOW);
    expect(adj).toMatchObject({ status: 'pending', changeLabel: '+5%' });
    expect(adj.lines.map((l) => [l.name, l.onOverride, l.new.dayRate])).toEqual(
      [
        ['D. Wijesinghe', true, 472.5],
        ['N. Silva', false, 420],
      ],
    );
    // 160 day hours × Rs 20 + 10 OT hours × Rs 30, for N. Silva last month
    expect(adj.totalMonthlyChange).toBe(3500);
    expect(h.rates).toHaveLength(2);
    expect(h.audit.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ action: 'Prepared pay change' }),
    );
  });

  it('nobody approves their own change, or one that includes them', async () => {
    const h = build();
    const adj = await h.service.prepare(raise, manager, NOW);
    await expect(
      h.service.decide(
        adj.id,
        'approve',
        undefined,
        { ...manager, role: 'Administrator' },
        NOW,
      ),
    ).rejects.toThrow(/You prepared this pay change/);
    // the Administrator's NIC belongs to D. Wijesinghe, who is in the change
    await expect(
      h.service.decide(adj.id, 'approve', undefined, admin, NOW),
    ).rejects.toThrow(/includes you \(D\. Wijesinghe\)/);
    expect((await h.service.list(admin))[0].approval).toEqual({
      canDecide: false,
      blockedReason:
        'This pay change includes you (D. Wijesinghe) — someone else must approve it.',
    });
  });

  it('approval writes the role rate once and an override for each person on their own rate; audited', async () => {
    const h = build();
    const adj = await h.service.prepare(raise, manager, NOW);
    const other: Actor = { ...admin, nic: null, sub: 9, name: 'S. Admin' };
    const done = await h.service.decide(
      adj.id,
      'approve',
      undefined,
      other,
      NOW,
    );
    expect(done.status).toBe('approved');
    const added = h.rates.slice(2);
    expect(
      added.map((r) => [
        r.scope,
        r.role ?? r.employeeId,
        r.dayRate,
        r.effectiveDate,
        r.source,
        r.adjustmentId,
      ]),
    ).toEqual([
      ['employee', 6, '472.5', '2026-12-01', 'adjustment', adj.id],
      ['role', 'Machine Operator', '420', '2026-12-01', 'adjustment', adj.id],
    ]);
    expect(h.refreshCache).toHaveBeenCalledWith([6, 2], NOW);
    expect(h.audit.record).toHaveBeenLastCalledWith(
      other,
      expect.objectContaining({ action: 'Approved pay change' }),
    );
  });

  it('a decrease needs the written-agreement confirmation; a processed month blocks it, even at approval', async () => {
    const h = build();
    const cut = {
      ...raise,
      scope: 'employees' as const,
      employeeIds: ['EMP-0002'],
      direction: 'decrease' as const,
      kind: 'amount' as const,
      amount: 10,
    };
    await expect(h.service.prepare(cut, manager, NOW)).rejects.toThrow(
      /written agreement/,
    );
    const adj = await h.service.prepare(
      { ...cut, decreaseAgreement: true },
      manager,
      NOW,
    );
    // December payroll gets processed while it waits
    h.runs.push({
      employeeId: 2,
      period: 'December 2026',
      status: 'Processed',
    });
    await expect(
      h.service.decide(
        adj.id,
        'approve',
        undefined,
        { ...admin, nic: null, sub: 9 },
        NOW,
      ),
    ).rejects.toThrow(ConflictException);
    expect(h.rates).toHaveLength(2);
  });

  it('a rejection needs a reason; only payRates: approve decides', async () => {
    const h = build();
    const adj = await h.service.prepare(raise, manager, NOW);
    await expect(
      h.service.decide(adj.id, 'reject', undefined, manager, NOW),
    ).rejects.toThrow(ForbiddenException);
    const other: Actor = { ...admin, nic: null, sub: 9 };
    await expect(
      h.service.decide(adj.id, 'reject', ' ', other, NOW),
    ).rejects.toThrow(BadRequestException);
    const r = await h.service.decide(
      adj.id,
      'reject',
      'Budget not approved',
      other,
      NOW,
    );
    expect(r).toMatchObject({
      status: 'rejected',
      decisionReason: 'Budget not approved',
    });
    expect(h.rates).toHaveLength(2);
  });
});
