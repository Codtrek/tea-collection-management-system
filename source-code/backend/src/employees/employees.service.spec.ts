import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { EmployeeAttendanceEntity } from './employee-attendance.entity';
import type { EmployeeEntity } from './employee.entity';
import { type Actor, EmployeesService } from './employees.service';
import type { CreateEmployeeDto } from './dto/create-employee.dto';
import type { MarkAttendanceDto } from './dto/mark-attendance.dto';
import type { PayrollRunEntity } from './payroll-run.entity';
import type { SalaryAdvanceEntity } from './salary-advance.entity';

/** Minimal in-memory stand-in for the TypeORM Repository surface the service uses. */
class FakeRepository<T extends { id: string | number }> {
  private readonly store = new Map<string | number, T>();

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
    this.store.set(record.id, record);
    return Promise.resolve(record);
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
  let service: EmployeesService;

  const admin: Actor = { name: 'A. Bandara', role: 'Administrator' };
  const officer: Actor = { name: 'S. Fernando', role: 'Officer' };
  const manager: Actor = { name: 'R. Jayasuriya', role: 'Manager' };

  beforeEach(() => {
    employeeRepo = new FakeRepository();
    attendanceRepo = new FakeRepository();
    advanceRepo = new FakeRepository();
    payrollRepo = new FakeRepository();

    service = new EmployeesService(
      employeeRepo as unknown as Repository<EmployeeEntity>,
      attendanceRepo as unknown as Repository<EmployeeAttendanceEntity>,
      advanceRepo as unknown as Repository<SalaryAdvanceEntity>,
      payrollRepo as unknown as Repository<PayrollRunEntity>,
    );
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
        'approve',
        officer,
      );
      expect(result.status).toBe('Approved');
      expect(result.decidedBy).toBe(officer.name);
    });

    it('allows Administrator to decide (reject)', async () => {
      advanceRepo.seed(makeAdvance());
      const result = await service.decideAdvance(
        'EMP-ADV-0001',
        'reject',
        admin,
      );
      expect(result.status).toBe('Rejected');
    });

    it('rejects Manager on decide', async () => {
      advanceRepo.seed(makeAdvance());
      await expect(
        service.decideAdvance('EMP-ADV-0001', 'approve', manager),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects deciding an already-decided advance', async () => {
      advanceRepo.seed(makeAdvance({ status: 'Approved' }));
      await expect(
        service.decideAdvance('EMP-ADV-0001', 'approve', officer),
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

    it('sums only Approved, not-yet-deducted advances into deductions.advances', async () => {
      employeeRepo.seed(makeEmployee());
      advanceRepo.seed(
        makeAdvance({ id: 'A1', status: 'Approved', amount: '5000.00' }),
      );
      advanceRepo.seed(
        makeAdvance({ id: 'A2', status: 'Pending', amount: '3000.00' }),
      );
      advanceRepo.seed(
        makeAdvance({
          id: 'A3',
          status: 'Approved',
          amount: '9000.00',
          deducted: true,
        }),
      );

      const [row] = await service.generatePayroll(
        { period: 'July 2026' },
        officer,
      );
      expect(row.deductions.advances).toBe(5000);
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
    it('excludes missing-bank rows and processes the rest', async () => {
      payrollRepo.seed(makePayroll({ id: 'PR-A', employeeId: 1 }));
      payrollRepo.seed(
        makePayroll({ id: 'PR-B', employeeId: 2, missingBank: true }),
      );

      const result = await service.processPayroll({}, officer);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('PR-A');
      expect(result[0].status).toBe('Processed');

      const stillPending = (await payrollRepo.find()).find(
        (r) => r.id === 'PR-B',
      );
      expect(stillPending?.status).toBe('Pending');
    });

    it('flips contributing advances to deducted', async () => {
      payrollRepo.seed(makePayroll({ id: 'PR-A', employeeId: 1 }));
      advanceRepo.seed(
        makeAdvance({ id: 'A1', employeeId: 1, status: 'Approved' }),
      );
      advanceRepo.seed(
        makeAdvance({ id: 'A2', employeeId: 2, status: 'Approved' }),
      );

      await service.processPayroll({}, officer);

      const advances = await advanceRepo.find();
      expect(advances.find((a) => a.id === 'A1')?.deducted).toBe(true);
      expect(advances.find((a) => a.id === 'A2')?.deducted).toBe(false);
    });

    it('rejects Manager', async () => {
      payrollRepo.seed(makePayroll());
      await expect(service.processPayroll({}, manager)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects when there is nothing eligible to process', async () => {
      payrollRepo.seed(makePayroll({ status: 'Processed' }));
      payrollRepo.seed(makePayroll({ id: 'PR-B', missingBank: true }));
      await expect(service.processPayroll({}, officer)).rejects.toThrow(
        ConflictException,
      );
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
