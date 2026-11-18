import type { Repository } from 'typeorm';
import type { AuditService } from '../audit/audit.service';
import { AdvancePlanService } from './advance-plan.service';
import type { AdvanceRecoveryEntity } from './advance-recovery.entity';
import type { AdvanceRescheduleEntity } from './advance-reschedule.entity';
import { projectSchedule } from './advance-schedule';
import type { EmployeeEntity } from './employee.entity';
import type { Actor, EmployeesService } from './employees.service';
import {
  DEFAULT_PAYROLL_SETTINGS,
  type PayrollSettingsService,
} from './payroll-settings.service';
import type { SalaryAdvanceEntity } from './salary-advance.entity';

class Fake<T extends { id: string | number }> {
  rows: T[] = [];
  private seq = 0;
  find(): Promise<T[]> {
    return Promise.resolve([...this.rows]);
  }
  findOne({ where }: { where: Partial<T> }): Promise<T | null> {
    const [k, v] = Object.entries(where)[0] as [keyof T, unknown];
    return Promise.resolve(this.rows.find((r) => r[k] === v) ?? null);
  }
  create(p: Partial<T>): T {
    return { createdAt: new Date(), ...p } as unknown as T;
  }
  save(r: T): Promise<T> {
    if (r.id === undefined) (r as { id: number }).id = ++this.seq;
    if (!this.rows.includes(r)) this.rows.push(r);
    return Promise.resolve(r);
  }
}

describe('AdvancePlanService — reschedule and early repayment', () => {
  const officer: Actor = { name: 'S. Fernando', role: 'Officer', sub: 2 };
  const admin: Actor = { name: 'A. Bandara', role: 'Administrator', sub: 1 };
  let advances: Fake<SalaryAdvanceEntity>;
  let recoveries: Fake<AdvanceRecoveryEntity>;
  let reschedules: Fake<AdvanceRescheduleEntity>;
  let service: AdvancePlanService;

  const processed = (period: string, amount: number) =>
    ({
      id: undefined,
      advanceId: 'A1',
      kind: 'payroll',
      period,
      status: 'recovered',
      plannedAmount: String(amount),
      amount: String(amount),
    }) as unknown as AdvanceRecoveryEntity;

  beforeEach(() => {
    advances = new Fake();
    recoveries = new Fake();
    reschedules = new Fake();
    const employees = new Fake<EmployeeEntity>();
    void employees.save({ id: 1, nic: '199012345678' } as EmployeeEntity);
    void advances.save({
      id: 'A1',
      employeeId: 1,
      employeeName: 'K. Perera',
      amount: '20000',
      status: 'Approved',
      deducted: false,
      installmentAmount: '5000',
      installmentMonths: 4,
      startPeriod: 'December 2026',
    } as SalaryAdvanceEntity);
    void recoveries.save(processed('December 2026', 5000));
    service = new AdvancePlanService(
      advances as unknown as Repository<SalaryAdvanceEntity>,
      recoveries as unknown as Repository<AdvanceRecoveryEntity>,
      reschedules as unknown as Repository<AdvanceRescheduleEntity>,
      employees as unknown as Repository<EmployeeEntity>,
      {
        toPublicAdvance: (a: SalaryAdvanceEntity) => a,
      } as unknown as EmployeesService,
      {
        get: () => Promise.resolve({ ...DEFAULT_PAYROLL_SETTINGS }),
      } as unknown as PayrollSettingsService,
      { record: jest.fn() } as unknown as AuditService,
    );
  });

  const scheduleNow = async () => {
    const a = advances.rows[0];
    return projectSchedule(
      {
        amount: 20000,
        installment: Number(a.installmentAmount),
        startPeriod: a.startPeriod!,
      },
      await recoveries.find(),
    );
  };

  it('a reschedule needs someone else to approve it, and never changes a processed month', async () => {
    const r = await service.requestReschedule(
      'A1',
      { installmentAmount: 2500, startMonth: '2027-02', note: 'Hardship' },
      officer,
    );
    expect(r.status).toBe('Pending');
    await expect(
      service.decideReschedule('A1', r.id, { decision: 'approve' }, officer),
    ).rejects.toThrow(/someone else must approve/);

    await service.decideReschedule('A1', r.id, { decision: 'approve' }, admin);
    const p = await scheduleNow();
    expect(p.months[0]).toMatchObject({
      period: 'December 2026',
      deducted: 5000,
      status: 'Deducted',
    });
    expect(p.months.slice(1).map((m) => [m.period, m.planned])).toEqual([
      ['February 2027', 2500],
      ['March 2027', 2500],
      ['April 2027', 2500],
      ['May 2027', 2500],
      ['June 2027', 2500],
      ['July 2027', 2500],
    ]);
  });

  it('refuses a reschedule that would start in an already-processed month', async () => {
    await expect(
      service.requestReschedule(
        'A1',
        { installmentAmount: 5000, startMonth: '2026-12', note: 'x' },
        officer,
      ),
    ).rejects.toThrow(/already processed/);
  });

  it('an early cash repayment reduces the balance and shortens the schedule', async () => {
    expect((await scheduleNow()).clearedPeriod).toBe('March 2027');
    await service.recordCashRepayment(
      'A1',
      { amount: 10000, paidOn: '2026-12-20', reference: 'RCPT-118' },
      officer,
    );
    const p = await scheduleNow();
    expect(p.clearedPeriod).toBe('January 2027');
    expect(recoveries.rows.find((r) => r.kind === 'cash')).toMatchObject({
      amount: '10000',
      reference: 'RCPT-118',
      status: 'recovered',
    });
  });

  it('can’t repay more than what’s left outside Pending payroll months', async () => {
    await expect(
      service.recordCashRepayment(
        'A1',
        { amount: 16000, paidOn: '2026-12-20', reference: 'R' },
        officer,
      ),
    ).rejects.toThrow(/At most Rs. 15,000/);
  });
});
