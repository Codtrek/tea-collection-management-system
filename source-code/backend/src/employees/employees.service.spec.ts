import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AGENT_JOB_ROLE } from './employee-roles';
import type { Repository } from 'typeorm';
import type { EmployeeAttendanceEntity } from './employee-attendance.entity';
import type { EmployeeEntity } from './employee.entity';
import { type Actor, EmployeesService } from './employees.service';
import type { CreateEmployeeDto } from './dto/create-employee.dto';
import type { MarkAttendanceDto } from './dto/mark-attendance.dto';
import type { PayrollRunEntity } from './payroll-run.entity';
import type { SalaryAdvanceEntity } from './salary-advance.entity';
import type { AdvanceRecoveryEntity } from './advance-recovery.entity';
import {
  DEFAULT_PAYROLL_SETTINGS,
  type PayrollSettingsService,
} from './payroll-settings.service';

/** Minimal in-memory stand-in for the TypeORM Repository surface the service uses. */
class FakeRepository<T extends { id: string | number }> {
  private readonly store = new Map<string | number, T>();
  private seq = 1000;

  seed(record: T): void {
    this.store.set(record.id, record);
  }

  find(): Promise<T[]> {
    return Promise.resolve([...this.store.values()]);
  }

  findOne({ where }: { where: Partial<T> }): Promise<T | null> {
    const [key, value] = Object.entries(where)[0] as [keyof T, unknown];
    return Promise.resolve(
      [...this.store.values()].find((r) => r[key] === value) ?? null,
    );
  }

  create(partial: Partial<T>): T {
    return partial as T;
  }

  save(record: T): Promise<T> {
    // a serial id, like the DB, for rows created without one (advance_recoveries)
    if (record.id === undefined) (record as { id: number }).id = ++this.seq;
    this.store.set(record.id, record);
    return Promise.resolve(record);
  }

  remove(record: T): Promise<T> {
    this.store.delete(record.id);
    return Promise.resolve(record);
  }

  delete({ id }: { id: string | number }): Promise<void> {
    this.store.delete(id);
    return Promise.resolve();
  }

  get size(): number {
    return this.store.size;
  }
}

function makeEmployee(overrides: Partial<EmployeeEntity> = {}): EmployeeEntity {
  return {
    id: 1,
    userId: null,
    name: 'N. Silva',
    nic: '199523456789',
    dob: '1995-08-03',
    contact: '0719876543',
    address: 'No. 5, Lake View, Nuwara Eliya',
    role: 'Machine Operator',
    department: 'Factory Floor',
    hireDate: '2023-11-01',
    employmentType: 'Permanent',
    status: 'Active',
    bankName: "People's Bank",
    bankBranch: 'Kandy',
    bankAccount: '1002458800',
    paymentMethod: 'bank',
    deactivatedOn: null,
    dayRate: '500.00',
    dayOtRate: '750.00',
    nightRate: '600.00',
    nightOtRate: '900.00',
    hasLogin: false,
    lastUpdatedBy: null,
    lastUpdatedOn: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeAttendance(
  overrides: Partial<EmployeeAttendanceEntity> = {},
): EmployeeAttendanceEntity {
  return {
    id: 1,
    employeeId: 1,
    date: '2026-07-01',
    status: 'Present',
    dayHours: '8.00',
    dayOtHours: '0.00',
    nightHours: '0.00',
    nightOtHours: '0.00',
    markedBy: 'S. Fernando',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeAdvance(
  overrides: Partial<SalaryAdvanceEntity> = {},
): SalaryAdvanceEntity {
  return {
    id: 'EMP-ADV-0001',
    employeeId: 1,
    employeeName: 'N. Silva',
    amount: '8000.00',
    reason: 'Family event',
    dateRequested: '2026-07-05',
    status: 'Pending',
    deducted: false,
    decidedBy: null,
    decidedOn: null,
    decisionReason: null,
    payrollPeriod: null,
    recoveredPeriod: null,
    installmentAmount: null,
    installmentMonths: null,
    startPeriod: null,
    requestedByUserId: null,
    requestedByName: null,
    planChangeNote: null,
    createdAt: new Date('2026-07-05T00:00:00.000Z'),
    ...overrides,
  };
}

function makePayroll(
  overrides: Partial<PayrollRunEntity> = {},
): PayrollRunEntity {
  return {
    id: 'PR-0001',
    employeeId: 1,
    employeeName: 'N. Silva',
    period: 'July 2026',
    dayHours: '160.00',
    dayOtHours: '0.00',
    nightHours: '0.00',
    nightOtHours: '0.00',
    dayRate: '500.00',
    dayOtRate: '750.00',
    nightRate: '600.00',
    nightOtRate: '900.00',
    gross: '80000.00',
    deductionsAdvances: '0.00',
    deductionsOther: '0.00',
    status: 'Pending',
    missingBank: false,
    processedBy: null,
    processedOn: null,
    excludedReason: null,
    excludedBy: null,
    excludedOn: null,
    isFinal: false,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  };
}

const validEmployeeDto: CreateEmployeeDto = {
  name: 'N. Silva',
  nic: '199523456789',
  dob: '1995-08-03',
  contact: '0719876543',
  address: 'No. 5, Lake View, Nuwara Eliya',
  role: 'Machine Operator',
  department: 'Factory Floor',
  hireDate: '2023-11-01',
  employmentType: 'Permanent',
  bank: "People's Bank",
  branch: 'Kandy',
  account: '1002458800',
  hasLogin: false,
};

describe('EmployeesService', () => {
  let employeeRepo: FakeRepository<EmployeeEntity>;
  let attendanceRepo: FakeRepository<EmployeeAttendanceEntity>;
  let advanceRepo: FakeRepository<SalaryAdvanceEntity>;
  let payrollRepo: FakeRepository<PayrollRunEntity>;
  let recoveryRepo: FakeRepository<AdvanceRecoveryEntity>;
  let service: EmployeesService;
  let auditRecord: jest.Mock;
  let provisioning: {
    assertContactFree: jest.Mock;
    provision: jest.Mock;
    deprovision: jest.Mock;
    syncContact: jest.Mock;
  };

  const admin: Actor = { name: 'A. Bandara', role: 'Administrator' };
  const officer: Actor = { name: 'S. Fernando', role: 'Officer' };
  const manager: Actor = { name: 'R. Jayasuriya', role: 'Manager' };

  beforeEach(() => {
    employeeRepo = new FakeRepository();
    attendanceRepo = new FakeRepository();
    advanceRepo = new FakeRepository();
    payrollRepo = new FakeRepository();
    recoveryRepo = new FakeRepository();
    provisioning = {
      assertContactFree: jest.fn().mockResolvedValue(undefined),
      provision: jest
        .fn()
        .mockResolvedValue({ initialPassword: 'Temp-pass-1' }),
      deprovision: jest.fn().mockResolvedValue([]),
      syncContact: jest.fn().mockResolvedValue(undefined),
    };

    auditRecord = jest.fn().mockResolvedValue(undefined);
    service = new EmployeesService(
      employeeRepo as unknown as Repository<EmployeeEntity>,
      attendanceRepo as unknown as Repository<EmployeeAttendanceEntity>,
      advanceRepo as unknown as Repository<SalaryAdvanceEntity>,
      payrollRepo as unknown as Repository<PayrollRunEntity>,
      {
        record: auditRecord,
      } as unknown as import('../audit/audit.service').AuditService,
      provisioning as unknown as import('../dispatch/agent-provisioning.service').AgentProvisioningService,
      recoveryRepo as unknown as Repository<AdvanceRecoveryEntity>,
      {
        get: () => Promise.resolve({ ...DEFAULT_PAYROLL_SETTINGS }),
      } as unknown as PayrollSettingsService,
    );
  });

  /** 10 day hours @ Rs. 500 in July = Rs. 5,000 gross for employee 1 */
  const seedJulyAttendance = (hours = 10) =>
    attendanceRepo.seed(
      makeAttendance({ id: 99, date: '2026-07-10', dayHours: String(hours) }),
    );
  const recovery = (
    over: Partial<AdvanceRecoveryEntity>,
  ): AdvanceRecoveryEntity =>
    ({
      id: Math.floor(Math.random() * 1e6),
      kind: 'payroll',
      period: 'July 2026',
      payrollRunId: null,
      status: 'reserved',
      plannedAmount: '0',
      amount: '0',
      reference: null,
      paidOn: null,
      recordedBy: null,
      createdAt: new Date(),
      ...over,
    }) as AdvanceRecoveryEntity;

  describe('Tea Collecting Agent role → dispatch', () => {
    const agentDto: CreateEmployeeDto = {
      ...validEmployeeDto,
      name: 'P. Fernando',
      nic: '199312345706',
      contact: '0777000016',
      role: AGENT_JOB_ROLE,
    };

    it('registering an agent provisions their mobile login and returns the one-time password', async () => {
      const result = await service.create(agentDto, admin);
      expect(provisioning.assertContactFree).toHaveBeenCalledWith('0777000016');
      expect(provisioning.provision).toHaveBeenCalledTimes(1);
      expect(result.role).toBe(AGENT_JOB_ROLE);
      expect(result.initialPassword).toBe('Temp-pass-1');
    });

    it('does not provision (or return a password) for any other role', async () => {
      const result = await service.create(validEmployeeDto, admin);
      expect(provisioning.provision).not.toHaveBeenCalled();
      expect(result.initialPassword).toBeUndefined();
    });

    it('refuses a contact number that already has a login — and saves nothing', async () => {
      provisioning.assertContactFree.mockRejectedValue(
        new ConflictException('already has a login'),
      );
      await expect(service.create(agentDto, admin)).rejects.toThrow(
        ConflictException,
      );
      expect(employeeRepo.size).toBe(0);
    });

    it('rolls the registration back if provisioning fails part-way', async () => {
      provisioning.provision.mockRejectedValue(new Error('db down'));
      await expect(service.create(agentDto, admin)).rejects.toThrow('db down');
      expect(employeeRepo.size).toBe(0);
    });

    it('deactivating an agent removes them from dispatch (frees routes, suspends login)', async () => {
      employeeRepo.seed(makeEmployee({ role: AGENT_JOB_ROLE }));
      provisioning.deprovision.mockResolvedValue([5]);
      await service.deactivate('EMP-0001', admin);
      expect(provisioning.deprovision).toHaveBeenCalledTimes(1);
    });

    it('deactivating a non-agent never touches dispatch', async () => {
      employeeRepo.seed(makeEmployee({ role: 'Driver' }));
      await service.deactivate('EMP-0001', admin);
      expect(provisioning.deprovision).not.toHaveBeenCalled();
    });

    it('changing an existing employee INTO the agent role provisions them', async () => {
      employeeRepo.seed(makeEmployee({ role: 'Driver' }));
      const result = await service.update(
        'EMP-0001',
        { ...validEmployeeDto, role: AGENT_JOB_ROLE },
        admin,
      );
      expect(provisioning.provision).toHaveBeenCalledTimes(1);
      expect(result.initialPassword).toBe('Temp-pass-1');
    });

    it('changing an agent AWAY from the role deprovisions them', async () => {
      employeeRepo.seed(makeEmployee({ role: AGENT_JOB_ROLE }));
      await service.update(
        'EMP-0001',
        { ...validEmployeeDto, role: 'Driver' },
        admin,
      );
      expect(provisioning.deprovision).toHaveBeenCalledTimes(1);
      expect(provisioning.provision).not.toHaveBeenCalled();
    });

    it('editing an agent who stays an agent keeps their login in step with the contact number', async () => {
      employeeRepo.seed(makeEmployee({ role: AGENT_JOB_ROLE }));
      await service.update(
        'EMP-0001',
        { ...validEmployeeDto, role: AGENT_JOB_ROLE },
        admin,
      );
      expect(provisioning.syncContact).toHaveBeenCalledTimes(1);
      expect(provisioning.provision).not.toHaveBeenCalled();
    });
  });

  describe('roster — Administrator only', () => {
    it('rejects Officer on create', async () => {
      await expect(service.create(validEmployeeDto, officer)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects Manager on create', async () => {
      await expect(service.create(validEmployeeDto, manager)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows Administrator to create', async () => {
      const result = await service.create(validEmployeeDto, admin);
      expect(result.name).toBe('N. Silva');
      expect(result.status).toBe('Active');
      expect(result.hasLogin).toBe(false);
    });

    it('rejects Officer on update', async () => {
      employeeRepo.seed(makeEmployee());
      await expect(
        service.update('EMP-0001', validEmployeeDto, officer),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects Officer on deactivate', async () => {
      employeeRepo.seed(makeEmployee());
      await expect(service.deactivate('EMP-0001', officer)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows Administrator to deactivate', async () => {
      employeeRepo.seed(makeEmployee());
      const result = await service.deactivate('EMP-0001', admin);
      expect(result.status).toBe('Inactive');
    });

    it('rejects a hire date in the future', async () => {
      await expect(
        service.create({ ...validEmployeeDto, hireDate: '2099-01-01' }, admin),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects an employee under 18', async () => {
      await expect(
        service.create({ ...validEmployeeDto, dob: '2020-01-01' }, admin),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('markAttendance — Manager read-only, default hours', () => {
    it('rejects Manager', async () => {
      employeeRepo.seed(makeEmployee());
      const dto: MarkAttendanceDto = {
        date: '2026-07-01',
        records: [{ employeeId: 'EMP-0001', status: 'Present' }],
      };
      await expect(service.markAttendance(dto, manager)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects an unknown employee id', async () => {
      const dto: MarkAttendanceDto = {
        date: '2026-07-01',
        records: [{ employeeId: 'EMP-9999', status: 'Present' }],
      };
      await expect(service.markAttendance(dto, officer)).rejects.toThrow();
    });

    it('infers 8 day hours for Present with no explicit hours', async () => {
      employeeRepo.seed(makeEmployee());
      const dto: MarkAttendanceDto = {
        date: '2026-07-01',
        records: [{ employeeId: 'EMP-0001', status: 'Present' }],
      };
      await service.markAttendance(dto, officer);
      const rows = await attendanceRepo.find();
      expect(rows[0].dayHours).toBe('8');
      expect(rows[0].status).toBe('Present');
    });

    it('infers 0 hours for Absent', async () => {
      employeeRepo.seed(makeEmployee());
      const dto: MarkAttendanceDto = {
        date: '2026-07-01',
        records: [{ employeeId: 'EMP-0001', status: 'Absent' }],
      };
      await service.markAttendance(dto, officer);
      const rows = await attendanceRepo.find();
      expect(rows[0].dayHours).toBe('0');
    });

    it('honors explicit hours over the status default', async () => {
      employeeRepo.seed(makeEmployee());
      const dto: MarkAttendanceDto = {
        date: '2026-07-01',
        records: [{ employeeId: 'EMP-0001', status: 'Present', nightHours: 6 }],
      };
      await service.markAttendance(dto, officer);
      const rows = await attendanceRepo.find();
      expect(rows[0].dayHours).toBe('0');
      expect(rows[0].nightHours).toBe('6');
    });

    it('upserts the same (employee, date) instead of duplicating', async () => {
      employeeRepo.seed(makeEmployee());
      attendanceRepo.seed(
        makeAttendance({ id: 1, status: 'Absent', dayHours: '0.00' }),
      );
      const dto: MarkAttendanceDto = {
        date: '2026-07-01',
        records: [{ employeeId: 'EMP-0001', status: 'Present' }],
      };
      await service.markAttendance(dto, officer);
      const rows = await attendanceRepo.find();
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe('Present');
    });
  });

  describe('advances — request + decide', () => {
    it('rejects Manager on request', async () => {
      employeeRepo.seed(makeEmployee());
      await expect(
        service.requestAdvance(
          { employeeId: 'EMP-0001', amount: 5000, reason: 'x' },
          manager,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows Officer to decide (approve)', async () => {
      advanceRepo.seed(makeAdvance());
      const result = await service.decideAdvance(
        'EMP-ADV-0001',
        { decision: 'approve' },
        officer,
      );
      expect(result.status).toBe('Approved');
      expect(result.decidedBy).toBe(officer.name);
    });

    it('allows Administrator to decide (reject) — the reason is stored and audited', async () => {
      advanceRepo.seed(makeAdvance());
      const result = await service.decideAdvance(
        'EMP-ADV-0001',
        { decision: 'reject', reason: ' Exceeds policy ' },
        admin,
      );
      expect(result).toMatchObject({
        status: 'Rejected',
        decisionReason: 'Exceeds policy',
      });
      expect(auditRecord).toHaveBeenCalledWith(
        admin,
        expect.objectContaining({
          action: 'Rejected advance Rs. 8000',
          record: 'EMP-ADV-0001',
          details: 'N. Silva — Exceeds policy',
        }),
      );
    });

    it('a rejection without a reason is refused and nothing changes', async () => {
      advanceRepo.seed(makeAdvance());
      await expect(
        service.decideAdvance(
          'EMP-ADV-0001',
          { decision: 'reject', reason: '   ' },
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
      expect((await advanceRepo.find())[0].status).toBe('Pending');
    });

    it('rejects Manager on decide', async () => {
      advanceRepo.seed(makeAdvance());
      await expect(
        service.decideAdvance('EMP-ADV-0001', { decision: 'approve' }, manager),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects deciding an already-decided advance', async () => {
      advanceRepo.seed(makeAdvance({ status: 'Approved' }));
      await expect(
        service.decideAdvance('EMP-ADV-0001', { decision: 'approve' }, officer),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('generatePayroll — aggregates attendance × rates', () => {
    it('computes gross from day/OT/night hours × the employee current rates', async () => {
      employeeRepo.seed(
        makeEmployee({
          dayRate: '500.00',
          dayOtRate: '750.00',
          nightRate: '600.00',
          nightOtRate: '900.00',
        }),
      );
      attendanceRepo.seed(
        makeAttendance({
          id: 1,
          date: '2026-07-01',
          dayHours: '8.00',
          dayOtHours: '2.00',
        }),
      );
      attendanceRepo.seed(
        makeAttendance({
          id: 2,
          date: '2026-07-02',
          dayHours: '0.00',
          nightHours: '8.00',
          nightOtHours: '1.00',
        }),
      );

      const [row] = await service.generatePayroll(
        { period: 'July 2026' },
        officer,
      );

      // 8*500 + 2*750 + 8*600 + 1*900 = 4000 + 1500 + 4800 + 900 = 11200
      expect(row.gross).toBe(11200);
      expect(row.shiftHours).toEqual({
        day: 8,
        dayOt: 2,
        night: 8,
        nightOt: 1,
      });
    });

    it('produces zero gross, not an error, for an employee with no attendance', async () => {
      employeeRepo.seed(makeEmployee());
      const [row] = await service.generatePayroll(
        { period: 'July 2026' },
        officer,
      );
      expect(row.gross).toBe(0);
    });

    it('sums only Approved advances with a balance left into deductions.advances', async () => {
      employeeRepo.seed(makeEmployee());
      seedJulyAttendance(20); // Rs. 10,000 gross → up to Rs. 5,000 (50%) for advances
      advanceRepo.seed(
        makeAdvance({ id: 'A1', status: 'Approved', amount: '5000.00' }),
      );
      advanceRepo.seed(
        makeAdvance({ id: 'A2', status: 'Pending', amount: '3000.00' }),
      );
      advanceRepo.seed(
        makeAdvance({ id: 'A3', status: 'Approved', amount: '9000.00' }),
      );
      // A3 is already recovered in full
      recoveryRepo.seed(
        recovery({
          advanceId: 'A3',
          period: 'June 2026',
          status: 'recovered',
          plannedAmount: '9000',
          amount: '9000',
        }),
      );

      const [row] = await service.generatePayroll(
        { period: 'July 2026' },
        officer,
      );
      expect(row.deductions.advances).toBe(5000);
    });

    it('NET IS NEVER BELOW Rs. 0 — with Rs. 0 gross nothing is deducted and it all carries forward', async () => {
      employeeRepo.seed(makeEmployee());
      advanceRepo.seed(
        makeAdvance({ id: 'A1', status: 'Approved', amount: '15000.00' }),
      );

      const [row] = await service.generatePayroll(
        { period: 'August 2026' },
        officer,
      );
      expect(row.gross).toBe(0);
      expect(row.deductions.advances).toBe(0);
      expect(row.advanceLines).toEqual([
        expect.objectContaining({
          advanceId: 'A1',
          planned: 15000,
          deducted: 0,
          carried: 15000,
          remainingAfter: 15000,
        }),
      ]);
    });

    it('applies the cap (50% of gross) and carries the rest into the next month', async () => {
      employeeRepo.seed(makeEmployee());
      seedJulyAttendance(20); // Rs. 10,000
      attendanceRepo.seed(
        makeAttendance({ id: 98, date: '2026-08-10', dayHours: '20' }),
      );
      advanceRepo.seed(
        makeAdvance({ id: 'A1', status: 'Approved', amount: '20000.00' }),
      );

      const [july] = await service.generatePayroll(
        { period: 'July 2026' },
        officer,
      );
      expect(july.deductions.advances).toBe(5000);
      expect(july.gross - july.deductions.advances).toBe(5000);
      expect(july.advanceLines?.[0]).toMatchObject({
        deducted: 5000,
        carried: 15000,
        remainingAfter: 15000,
      });

      // August plans against what July hasn't reserved — never the same money twice
      const [august] = await service.generatePayroll(
        { period: 'August 2026' },
        officer,
      );
      expect(august.deductions.advances).toBe(5000);
      // recalculating July keeps its own reservation
      const [julyAgain] = await service.generatePayroll(
        { period: 'July 2026' },
        officer,
      );
      expect(julyAgain.deductions.advances).toBe(5000);
      expect(await recoveryRepo.find()).toHaveLength(2);
    });

    it('flags missingBank when any bank field is empty', async () => {
      employeeRepo.seed(makeEmployee({ bankAccount: '' }));
      const [row] = await service.generatePayroll(
        { period: 'July 2026' },
        officer,
      );
      expect(row.missingBank).toBe(true);
    });

    it('skips non-Active employees', async () => {
      employeeRepo.seed(makeEmployee({ status: 'Suspended' }));
      const rows = await service.generatePayroll(
        { period: 'July 2026' },
        officer,
      );
      expect(rows).toHaveLength(0);
    });

    it('rejects Manager', async () => {
      employeeRepo.seed(makeEmployee());
      await expect(
        service.generatePayroll({ period: 'July 2026' }, manager),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('processPayroll — missing-bank exclusion, advance deduction flip', () => {
    const noBank = { bankName: null, bankBranch: null, bankAccount: null };

    it('BLOCKS the run, naming them, when a bank-paid employee has no bank details', async () => {
      employeeRepo.seed(makeEmployee());
      employeeRepo.seed(
        makeEmployee({ id: 2, name: 'T. Rajapaksa', ...noBank }),
      );
      payrollRepo.seed(makePayroll({ id: 'PR-A', employeeId: 1 }));
      payrollRepo.seed(
        makePayroll({
          id: 'PR-B',
          employeeId: 2,
          employeeName: 'T. Rajapaksa',
        }),
      );

      await expect(service.processPayroll({}, officer)).rejects.toThrow(
        /T\. Rajapaksa/,
      );
      const rows = await payrollRepo.find();
      expect(rows.every((r) => r.status === 'Pending')).toBe(true);
    });

    it('excluded with a reason: the rest are processed, theirs stays Pending with the reason, audited', async () => {
      employeeRepo.seed(makeEmployee());
      employeeRepo.seed(
        makeEmployee({ id: 2, name: 'T. Rajapaksa', ...noBank }),
      );
      payrollRepo.seed(makePayroll({ id: 'PR-A', employeeId: 1 }));
      payrollRepo.seed(
        makePayroll({
          id: 'PR-B',
          employeeId: 2,
          employeeName: 'T. Rajapaksa',
        }),
      );

      const result = await service.processPayroll(
        {
          period: 'July 2026',
          exclusions: [{ employeeId: 'EMP-0002', reason: 'Bank form pending' }],
        },
        officer,
      );

      expect(result.map((r) => r.id)).toEqual(['PR-A']);
      const excluded = (await payrollRepo.find()).find((r) => r.id === 'PR-B');
      expect(excluded).toMatchObject({
        status: 'Pending',
        excludedReason: 'Bank form pending',
        excludedBy: officer.name,
      });
      expect(auditRecord).toHaveBeenCalledWith(
        officer,
        expect.objectContaining({
          action: 'Excluded 1 employee(s) from payroll run',
          details: 'T. Rajapaksa: Bank form pending',
        }),
      );
    });

    it('checks bank details LIVE: cash-paid, or fixed since Generate, is processed', async () => {
      employeeRepo.seed(makeEmployee({ ...noBank, paymentMethod: 'cash' }));
      employeeRepo.seed(makeEmployee({ id: 2 }));
      payrollRepo.seed(makePayroll({ id: 'PR-A', employeeId: 1 }));
      // the generate-time snapshot said missing; the details were added afterwards
      payrollRepo.seed(
        makePayroll({ id: 'PR-B', employeeId: 2, missingBank: true }),
      );

      const result = await service.processPayroll({}, officer);
      expect(result.map((r) => r.id).sort()).toEqual(['PR-A', 'PR-B']);
    });

    it('recovers what the row reserved; the advance is marked recovered only once its balance is 0', async () => {
      payrollRepo.seed(makePayroll({ id: 'PR-A', employeeId: 1 }));
      advanceRepo.seed(
        makeAdvance({ id: 'FULL', status: 'Approved', amount: '8000' }),
      );
      advanceRepo.seed(
        makeAdvance({ id: 'PART', status: 'Approved', amount: '8000' }),
      );
      recoveryRepo.seed(
        recovery({
          id: 1,
          advanceId: 'FULL',
          plannedAmount: '8000',
          amount: '8000',
        }),
      );
      recoveryRepo.seed(
        recovery({
          id: 2,
          advanceId: 'PART',
          plannedAmount: '8000',
          amount: '3000',
        }),
      );

      await service.processPayroll({}, officer);

      const recs = await recoveryRepo.find();
      expect(recs.every((r) => r.status === 'recovered')).toBe(true);
      const advances = await advanceRepo.find();
      expect(advances.find((a) => a.id === 'FULL')?.deducted).toBe(true);
      // Rs. 5,000 is carried forward — still open
      expect(advances.find((a) => a.id === 'PART')?.deducted).toBe(false);
    });

    it('an advance approved after Generate is NOT recovered — it was never deducted', async () => {
      payrollRepo.seed(makePayroll({ id: 'PR-A', employeeId: 1 }));
      advanceRepo.seed(
        makeAdvance({ id: 'LATE', employeeId: 1, status: 'Approved' }),
      );

      await service.processPayroll({}, officer);

      expect(await recoveryRepo.find()).toHaveLength(0);
      const late = (await advanceRepo.find()).find((a) => a.id === 'LATE');
      expect(late?.deducted).toBe(false);
    });

    it('refuses to process a row whose net is below Rs. 0 (generated before the floor existed)', async () => {
      payrollRepo.seed(
        makePayroll({ id: 'PR-A', gross: '0', deductionsAdvances: '15000' }),
      );
      await expect(
        service.processPayroll({ period: 'July 2026' }, officer),
      ).rejects.toThrow(/below Rs\. 0.*recalculate/);
      expect((await payrollRepo.find())[0].status).toBe('Pending');
    });

    it('rejects Manager', async () => {
      payrollRepo.seed(makePayroll());
      await expect(service.processPayroll({}, manager)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects when there is nothing eligible to process', async () => {
      payrollRepo.seed(makePayroll({ status: 'Processed' }));
      payrollRepo.seed(makePayroll({ id: 'PR-B', status: 'Processed' }));
      await expect(service.processPayroll({}, officer)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('installments — plan, approval changes, no self-approval (§10)', () => {
    const asUser = (
      a: Actor,
      sub: number,
      nic: string | null = null,
    ): Actor => ({
      ...a,
      sub,
      nic,
    });

    it('stores the plan: an amount per month fills in the months, from the given start month', async () => {
      employeeRepo.seed(makeEmployee());
      const a = await service.requestAdvance(
        {
          employeeId: 'EMP-0001',
          amount: 20000,
          reason: 'School fees',
          repayment: 'installments',
          installmentAmount: 6000,
          startMonth: '2026-12',
        },
        asUser(officer, 2),
      );
      expect(a.plan).toEqual({
        installment: 6000,
        months: 4,
        startPeriod: 'December 2026',
      });
      expect(a.clearedPeriod).toBe('March 2027');
      expect(a.requestedBy).toBe(officer.name);
    });

    it('a number of months fills in the installment; one deduction is amount × 1', async () => {
      employeeRepo.seed(makeEmployee());
      const byMonths = await service.requestAdvance(
        {
          employeeId: 'EMP-0001',
          amount: 20000,
          reason: 'x',
          repayment: 'installments',
          months: 6,
          startMonth: '2027-01',
        },
        officer,
      );
      expect(byMonths.plan).toMatchObject({ installment: 3334, months: 6 });
      const single = await service.requestAdvance(
        {
          employeeId: 'EMP-0001',
          amount: 8000,
          reason: 'x',
          startMonth: '2027-01',
        },
        officer,
      );
      expect(single.plan).toMatchObject({ installment: 8000, months: 1 });
    });

    it('refuses an installment above the advance or a plan longer than the maximum (6)', async () => {
      employeeRepo.seed(makeEmployee());
      const req = (installmentAmount: number) =>
        service.requestAdvance(
          {
            employeeId: 'EMP-0001',
            amount: 20000,
            reason: 'x',
            repayment: 'installments',
            installmentAmount,
          },
          officer,
        );
      await expect(req(25000)).rejects.toThrow(BadRequestException);
      await expect(req(3000)).rejects.toThrow(/most allowed is 6/);
    });

    it('SELF-APPROVAL IS BLOCKED ON THE SERVER — the requester can’t approve it', async () => {
      advanceRepo.seed(makeAdvance({ requestedByUserId: 2 }));
      await expect(
        service.decideAdvance(
          'EMP-ADV-0001',
          { decision: 'approve' },
          asUser(officer, 2),
        ),
      ).rejects.toThrow(/You requested this advance/);
      expect((await advanceRepo.find())[0].status).toBe('Pending');
      // someone else can
      const ok = await service.decideAdvance(
        'EMP-ADV-0001',
        { decision: 'approve' },
        asUser(admin, 1),
      );
      expect(ok.status).toBe('Approved');
    });

    it('…nor the employee themself — NICs compared in the 12-digit form (old 853202937V = 198532002937)', async () => {
      employeeRepo.seed(makeEmployee({ nic: '853202937V' }));
      advanceRepo.seed(makeAdvance({ requestedByUserId: 7 }));
      await expect(
        service.decideAdvance(
          'EMP-ADV-0001',
          { decision: 'approve' },
          asUser(officer, 2, '198532002937'),
        ),
      ).rejects.toThrow(/This advance is for you/);
    });

    it('an approver may change the plan, but only with a note', async () => {
      advanceRepo.seed(
        makeAdvance({
          amount: '20000',
          installmentAmount: '20000',
          installmentMonths: 1,
          startPeriod: 'December 2026',
        }),
      );
      await expect(
        service.decideAdvance(
          'EMP-ADV-0001',
          { decision: 'approve', installmentAmount: 5000 },
          admin,
        ),
      ).rejects.toThrow(/note is required/);
      const ok = await service.decideAdvance(
        'EMP-ADV-0001',
        {
          decision: 'approve',
          installmentAmount: 5000,
          note: 'Spread over 4 months',
        },
        admin,
      );
      expect(ok).toMatchObject({
        plan: { installment: 5000, months: 4, startPeriod: 'December 2026' },
        planChangeNote: 'Spread over 4 months',
      });
    });
  });

  describe('installments in payroll — one installment a month from the start month (§10)', () => {
    it('deducts nothing before the start month, then one installment a month', async () => {
      employeeRepo.seed(makeEmployee());
      seedJulyAttendance(100); // Rs. 50,000 gross — the cap isn't the limit here
      attendanceRepo.seed(
        makeAttendance({ id: 98, date: '2026-08-10', dayHours: '100' }),
      );
      advanceRepo.seed(
        makeAdvance({
          id: 'A1',
          status: 'Approved',
          amount: '20000',
          installmentAmount: '6000',
          installmentMonths: 4,
          startPeriod: 'August 2026',
        }),
      );
      const [july] = await service.generatePayroll(
        { period: 'July 2026' },
        officer,
      );
      const [august] = await service.generatePayroll(
        { period: 'August 2026' },
        officer,
      );
      expect(july.deductions.advances).toBe(0);
      expect(august.deductions.advances).toBe(6000);
    });

    it('a leaver’s final payroll owes the whole balance, up to the cap — the rest is reported', async () => {
      employeeRepo.seed(
        makeEmployee({ status: 'Inactive', deactivatedOn: '2026-07-20' }),
      );
      seedJulyAttendance(20); // Rs. 10,000 → cap Rs. 5,000
      advanceRepo.seed(
        makeAdvance({
          id: 'A1',
          status: 'Approved',
          amount: '20000',
          installmentAmount: '2000',
          installmentMonths: 10,
          startPeriod: 'September 2026',
        }),
      );
      const [row] = await service.generatePayroll(
        { period: 'July 2026' },
        officer,
      );
      expect(row.isFinal).toBe(true);
      expect(row.deductions.advances).toBe(5000);
      expect(row.advanceLines?.[0]).toMatchObject({
        planned: 20000,
        deducted: 5000,
        remainingAfter: 15000,
      });
      // no row for a month after they left
      expect(
        await service.generatePayroll({ period: 'August 2026' }, officer),
      ).toHaveLength(0);
    });
  });

  describe('not found', () => {
    it('rejects an unknown employee id', async () => {
      await expect(service.findById('EMP-9999')).rejects.toThrow();
    });

    it('rejects a malformed employee id', async () => {
      await expect(service.findById('nope')).rejects.toThrow();
    });
  });
});
