import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AppRole } from '../auth/role-map';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { GeneratePayrollDto } from './dto/generate-payroll.dto';
import {
  MarkAttendanceDto,
  AttendanceRecordDto,
} from './dto/mark-attendance.dto';
import { ProcessPayrollDto } from './dto/process-payroll.dto';
import { RequestAdvanceDto } from './dto/request-advance.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeAttendanceEntity } from './employee-attendance.entity';
import {
  formatEmployeeId,
  parseEmployeeId,
  type DbAttendanceStatus,
  type PublicAdvance,
  type PublicAttendance,
  type PublicEmployee,
  type PublicPayrollRow,
} from './employee-map';
import { EmployeeEntity } from './employee.entity';
import { PayrollRunEntity } from './payroll-run.entity';
import { SalaryAdvanceEntity } from './salary-advance.entity';

export interface Actor {
  name: string;
  role: AppRole;
}

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepo: Repository<EmployeeEntity>,
    @InjectRepository(EmployeeAttendanceEntity)
    private readonly attendanceRepo: Repository<EmployeeAttendanceEntity>,
    @InjectRepository(SalaryAdvanceEntity)
    private readonly advanceRepo: Repository<SalaryAdvanceEntity>,
    @InjectRepository(PayrollRunEntity)
    private readonly payrollRepo: Repository<PayrollRunEntity>,
  ) {}

  async findAll(): Promise<PublicEmployee[]> {
    const employees = await this.employeeRepo.find({ order: { name: 'ASC' } });
    return employees.map((e) => this.toPublic(e));
  }

  async findById(id: string): Promise<PublicEmployee> {
    return this.toPublic(await this.findEntity(id));
  }

  /** EMP-02 — Administrator only (portal: `employees: 'approve'`, Officer is view-only on the roster). */
  async create(dto: CreateEmployeeDto, actor: Actor): Promise<PublicEmployee> {
    this.assertIsAdmin(actor);
    this.assertAge18(dto.dob);
    this.assertHireDateNotFuture(dto.hireDate);

    const existing = await this.employeeRepo.findOne({
      where: { nic: dto.nic },
    });
    if (existing) {
      throw new ConflictException(
        `An employee with NIC "${dto.nic}" already exists.`,
      );
    }

    // Employee self-service login is out of scope for this admin-portal
    // slice (see Claude.md) — `hasLogin` is stored as a flag only; this
    // module never provisions a `users` row itself, unlike Estates'
    // owner-registration flow.
    const employee = this.employeeRepo.create({
      userId: null,
      name: dto.name,
      nic: dto.nic,
      dob: dto.dob,
      contact: dto.contact,
      address: dto.address,
      role: dto.role,
      department: dto.department,
      hireDate: dto.hireDate,
      employmentType: dto.employmentType,
      status: 'Active',
      bankName: dto.bank,
      bankBranch: dto.branch,
      bankAccount: dto.account,
      dayRate: String(dto.dayRate ?? 0),
      dayOtRate: String(dto.dayOtRate ?? 0),
      nightRate: String(dto.nightRate ?? 0),
      nightOtRate: String(dto.nightOtRate ?? 0),
      hasLogin: dto.hasLogin,
      lastUpdatedBy: actor.name,
      lastUpdatedOn: new Date(),
    });

    return this.toPublic(await this.employeeRepo.save(employee));
  }

  /** EMP-04 — Administrator only, same as create. */
  async update(
    id: string,
    dto: UpdateEmployeeDto,
    actor: Actor,
  ): Promise<PublicEmployee> {
    this.assertIsAdmin(actor);
    this.assertAge18(dto.dob);
    this.assertHireDateNotFuture(dto.hireDate);
    const employee = await this.findEntity(id);

    employee.name = dto.name;
    employee.nic = dto.nic;
    employee.dob = dto.dob;
    employee.contact = dto.contact;
    employee.address = dto.address;
    employee.role = dto.role;
    employee.department = dto.department;
    employee.hireDate = dto.hireDate;
    employee.employmentType = dto.employmentType;
    employee.bankName = dto.bank;
    employee.bankBranch = dto.branch;
    employee.bankAccount = dto.account;
    if (dto.dayRate !== undefined) employee.dayRate = String(dto.dayRate);
    if (dto.dayOtRate !== undefined) employee.dayOtRate = String(dto.dayOtRate);
    if (dto.nightRate !== undefined) employee.nightRate = String(dto.nightRate);
    if (dto.nightOtRate !== undefined)
      employee.nightOtRate = String(dto.nightOtRate);
    employee.hasLogin = dto.hasLogin;
    employee.lastUpdatedBy = actor.name;
    employee.lastUpdatedOn = new Date();

    return this.toPublic(await this.employeeRepo.save(employee));
  }

  /** Administrator only (portal: `employees: 'approve'`). */
  async deactivate(id: string, actor: Actor): Promise<PublicEmployee> {
    this.assertIsAdmin(actor);
    const employee = await this.findEntity(id);
    employee.status = 'Inactive';
    employee.lastUpdatedBy = actor.name;
    employee.lastUpdatedOn = new Date();
    return this.toPublic(await this.employeeRepo.save(employee));
  }

  async listAttendance(
    employeeId?: string,
    month?: string,
  ): Promise<PublicAttendance[]> {
    const all = await this.attendanceRepo.find();
    const employees = await this.employeeRepo.find();
    const empFilter = employeeId ? parseEmployeeId(employeeId) : null;
    const filtered = all.filter((a) => {
      if (empFilter !== null && a.employeeId !== empFilter) return false;
      if (month && !a.date.startsWith(month)) return false;
      return true;
    });
    return filtered.map((a) =>
      this.toPublicAttendance(
        a,
        employees.find((e) => e.id === a.employeeId),
      ),
    );
  }

  /** EMP-05/08 — bulk roll-call; upserts one row per (employee, date). Officer+ (portal: `attendance: 'edit'`). */
  async markAttendance(dto: MarkAttendanceDto, actor: Actor): Promise<void> {
    this.assertCanWrite(actor);
    const existing = await this.attendanceRepo.find();
    // Validate every id up front so a bad id 404s cleanly instead of surfacing
    // as an FK-violation 500 partway through the batch.
    for (const record of dto.records) {
      await this.findEntity(record.employeeId);
    }

    for (const record of dto.records) {
      const employeeId = parseEmployeeId(record.employeeId);
      const hours = this.resolveHours(record);
      const found = existing.find(
        (a) => a.employeeId === employeeId && a.date === dto.date,
      );

      if (found) {
        found.status = record.status;
        found.dayHours = String(hours.dayHours);
        found.dayOtHours = String(hours.dayOtHours);
        found.nightHours = String(hours.nightHours);
        found.nightOtHours = String(hours.nightOtHours);
        found.markedBy = actor.name;
        await this.attendanceRepo.save(found);
      } else {
        const created = this.attendanceRepo.create({
          employeeId,
          date: dto.date,
          status: record.status,
          dayHours: String(hours.dayHours),
          dayOtHours: String(hours.dayOtHours),
          nightHours: String(hours.nightHours),
          nightOtHours: String(hours.nightOtHours),
          markedBy: actor.name,
        });
        await this.attendanceRepo.save(created);
        existing.push(created);
      }
    }
  }

  async listAdvances(): Promise<PublicAdvance[]> {
    const advances = await this.advanceRepo.find({
      order: { dateRequested: 'DESC' },
    });
    return advances.map((a) => this.toPublicAdvance(a));
  }

  /** EMP-09/10 (request side) — Officer+ (portal: `advances: 'edit'`). No money moves yet. */
  async requestAdvance(
    dto: RequestAdvanceDto,
    actor: Actor,
  ): Promise<PublicAdvance> {
    this.assertCanWrite(actor);
    const employee = await this.findEntity(dto.employeeId);

    const advance = this.advanceRepo.create({
      id: this.generateAdvanceId(),
      employeeId: employee.id,
      employeeName: employee.name,
      amount: String(dto.amount),
      reason: dto.reason,
      dateRequested: new Date().toISOString().slice(0, 10),
      status: 'Pending',
      deducted: false,
    });

    return this.toPublicAdvance(await this.advanceRepo.save(advance));
  }

  /** EMP-10 (approval side) — Officer or Administrator (portal: `advances: 'approve'` for both). */
  async decideAdvance(
    id: string,
    decision: 'approve' | 'reject',
    actor: Actor,
  ): Promise<PublicAdvance> {
    this.assertCanWrite(actor);
    const advance = await this.advanceRepo.findOne({ where: { id } });
    if (!advance) {
      throw new NotFoundException(`No advance request "${id}".`);
    }
    if (advance.status !== 'Pending') {
      throw new ConflictException(`Advance "${id}" has already been decided.`);
    }

    advance.status = decision === 'approve' ? 'Approved' : 'Rejected';
    advance.decidedBy = actor.name;
    advance.decidedOn = new Date();

    return this.toPublicAdvance(await this.advanceRepo.save(advance));
  }

  async listPayroll(
    period?: string,
    status?: string,
  ): Promise<PublicPayrollRow[]> {
    const all = await this.payrollRepo.find({ order: { period: 'DESC' } });
    const filtered = all.filter((row) => {
      if (period && row.period !== period) return false;
      if (status && row.status !== status) return false;
      return true;
    });
    return filtered.map((r) => this.toPublicPayroll(r));
  }

  /**
   * EMP-11 — aggregates each Active employee's `employee_attendance` rows in
   * the period into hour buckets, multiplies by the employee's *current*
   * rates (snapshotted onto the row), and sums their Approved-but-not-yet-
   * deducted advances into `deductions.advances`. Upserts one row per
   * (employee, period) — regenerating a period leaves already-Processed rows
   * untouched (a processed run is immutable, mirrors Estates' settlements).
   * Officer+ (portal: `payroll: 'edit'`).
   */
  async generatePayroll(
    dto: GeneratePayrollDto,
    actor: Actor,
  ): Promise<PublicPayrollRow[]> {
    this.assertCanWrite(actor);

    const employees = await this.employeeRepo.find();
    const attendance = await this.attendanceRepo.find();
    const advances = await this.advanceRepo.find();
    const existingRuns = await this.payrollRepo.find();

    const results: PayrollRunEntity[] = [];

    for (const employee of employees.filter((e) => e.status === 'Active')) {
      const existing = existingRuns.find(
        (r) => r.employeeId === employee.id && r.period === dto.period,
      );
      if (existing && existing.status === 'Processed') {
        results.push(existing);
        continue;
      }

      const periodAttendance = attendance.filter(
        (a) =>
          a.employeeId === employee.id && this.inPeriod(a.date, dto.period),
      );
      const totals = periodAttendance.reduce(
        (sum, a) => ({
          dayHours: sum.dayHours + Number(a.dayHours),
          dayOtHours: sum.dayOtHours + Number(a.dayOtHours),
          nightHours: sum.nightHours + Number(a.nightHours),
          nightOtHours: sum.nightOtHours + Number(a.nightOtHours),
        }),
        { dayHours: 0, dayOtHours: 0, nightHours: 0, nightOtHours: 0 },
      );

      const dayRate = Number(employee.dayRate);
      const dayOtRate = Number(employee.dayOtRate);
      const nightRate = Number(employee.nightRate);
      const nightOtRate = Number(employee.nightOtRate);
      const gross =
        totals.dayHours * dayRate +
        totals.dayOtHours * dayOtRate +
        totals.nightHours * nightRate +
        totals.nightOtHours * nightOtRate;

      const deductionsAdvances = advances
        .filter(
          (a) =>
            a.employeeId === employee.id &&
            a.status === 'Approved' &&
            !a.deducted,
        )
        .reduce((sum, a) => sum + Number(a.amount), 0);

      const missingBank =
        !employee.bankName || !employee.bankBranch || !employee.bankAccount;

      if (existing) {
        existing.dayHours = String(totals.dayHours);
        existing.dayOtHours = String(totals.dayOtHours);
        existing.nightHours = String(totals.nightHours);
        existing.nightOtHours = String(totals.nightOtHours);
        existing.dayRate = String(dayRate);
        existing.dayOtRate = String(dayOtRate);
        existing.nightRate = String(nightRate);
        existing.nightOtRate = String(nightOtRate);
        existing.gross = String(gross);
        existing.deductionsAdvances = String(deductionsAdvances);
        existing.missingBank = missingBank;
        results.push(await this.payrollRepo.save(existing));
      } else {
        const created = this.payrollRepo.create({
          id: this.generatePayrollId(),
          employeeId: employee.id,
          employeeName: employee.name,
          period: dto.period,
          dayHours: String(totals.dayHours),
          dayOtHours: String(totals.dayOtHours),
          nightHours: String(totals.nightHours),
          nightOtHours: String(totals.nightOtHours),
          dayRate: String(dayRate),
          dayOtRate: String(dayOtRate),
          nightRate: String(nightRate),
          nightOtRate: String(nightOtRate),
          gross: String(gross),
          deductionsAdvances: String(deductionsAdvances),
          deductionsOther: '0',
          status: 'Pending',
          missingBank,
        });
        results.push(await this.payrollRepo.save(created));
      }
    }

    return results.map((r) => this.toPublicPayroll(r));
  }

  /**
   * EMP-12 — processes every currently-Pending row (optionally scoped to one
   * period). Missing-bank employees are excluded, not blocked (mirrors
   * Estates' UC-054) — fix their bank details and they're picked up next
   * run. Included rows' contributing advances flip to `deducted`. No
   * per-transaction bank charge is applied (resolved 2026-07-26 — see
   * Claude.md's Payment calculation section). Officer+ (portal: `payroll: 'edit'`).
   */
  async processPayroll(
    dto: ProcessPayrollDto,
    actor: Actor,
  ): Promise<PublicPayrollRow[]> {
    this.assertCanWrite(actor);

    const all = await this.payrollRepo.find();
    const eligible = all.filter(
      (r) =>
        r.status === 'Pending' &&
        !r.missingBank &&
        (!dto.period || r.period === dto.period),
    );

    if (eligible.length === 0) {
      throw new ConflictException(
        'No pending payroll rows are ready to process.',
      );
    }

    const now = new Date();
    const processed: PayrollRunEntity[] = [];
    const allAdvances = await this.advanceRepo.find();

    for (const row of eligible) {
      row.status = 'Processed';
      row.processedBy = actor.name;
      row.processedOn = now;
      processed.push(await this.payrollRepo.save(row));

      for (const advance of allAdvances) {
        if (
          advance.employeeId === row.employeeId &&
          advance.status === 'Approved' &&
          !advance.deducted
        ) {
          advance.deducted = true;
          await this.advanceRepo.save(advance);
        }
      }
    }

    return processed.map((r) => this.toPublicPayroll(r));
  }

  private async findEntity(formattedId: string): Promise<EmployeeEntity> {
    const id = parseEmployeeId(formattedId);
    const employee = Number.isNaN(id)
      ? null
      : await this.employeeRepo.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException(`No employee "${formattedId}".`);
    }
    return employee;
  }

  /** Roster create/update/deactivate are Administrator-only (portal: `employees: 'approve'`, Officer is view-only). */
  private assertIsAdmin(actor: Actor): void {
    if (actor.role !== 'Administrator') {
      throw new ForbiddenException(
        'Only an Administrator can manage the employee roster.',
      );
    }
  }

  /** Manager has read-only access to attendance/advances/payroll (Administrator/Officer can write). */
  private assertCanWrite(actor: Actor): void {
    if (actor.role === 'Manager') {
      throw new ForbiddenException(
        'Managers have read-only access to this resource.',
      );
    }
  }

  private assertAge18(dob: string): void {
    const years =
      (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000);
    if (years < 18) {
      throw new ConflictException('Employee must be 18 or older.');
    }
  }

  private assertHireDateNotFuture(hireDate: string): void {
    if (new Date(hireDate) > new Date()) {
      throw new ConflictException('Hire date cannot be in the future.');
    }
  }

  /** Fills omitted hour fields from `status` (Present→8 day, Half-day→4, else 0); explicit values always win. */
  private resolveHours(record: AttendanceRecordDto): {
    dayHours: number;
    dayOtHours: number;
    nightHours: number;
    nightOtHours: number;
  } {
    const anyProvided =
      record.dayHours !== undefined ||
      record.dayOtHours !== undefined ||
      record.nightHours !== undefined ||
      record.nightOtHours !== undefined;

    if (anyProvided) {
      return {
        dayHours: record.dayHours ?? 0,
        dayOtHours: record.dayOtHours ?? 0,
        nightHours: record.nightHours ?? 0,
        nightOtHours: record.nightOtHours ?? 0,
      };
    }

    const defaultDayHours: Partial<Record<DbAttendanceStatus, number>> = {
      Present: 8,
      'Half-day': 4,
    };
    return {
      dayHours: defaultDayHours[record.status] ?? 0,
      dayOtHours: 0,
      nightHours: 0,
      nightOtHours: 0,
    };
  }

  /** Whether an attendance date (YYYY-MM-DD) falls within a period label like 'July 2026'. */
  private inPeriod(date: string, period: string): boolean {
    const parsed = new Date(`1 ${period}`);
    if (Number.isNaN(parsed.getTime())) return false;
    const [year, month] = date.split('-').map(Number);
    return year === parsed.getFullYear() && month === parsed.getMonth() + 1;
  }

  private toPublic(entity: EmployeeEntity): PublicEmployee {
    return {
      id: formatEmployeeId(entity.id),
      name: entity.name,
      nic: entity.nic,
      dob: entity.dob ?? '',
      contact: entity.contact ?? '',
      address: entity.address ?? '',
      role: entity.role,
      department: entity.department ?? '',
      hireDate: entity.hireDate ?? '',
      employmentType: entity.employmentType,
      status: entity.status,
      bank: {
        bank: entity.bankName ?? '',
        branch: entity.bankBranch ?? '',
        account: entity.bankAccount ?? '',
      },
      hasLogin: entity.hasLogin,
      lastUpdatedBy: entity.lastUpdatedBy ?? undefined,
      lastUpdatedOn: entity.lastUpdatedOn
        ? entity.lastUpdatedOn.toISOString()
        : undefined,
      rates: {
        day: Number(entity.dayRate),
        dayOt: Number(entity.dayOtRate),
        night: Number(entity.nightRate),
        nightOt: Number(entity.nightOtRate),
      },
    };
  }

  private toPublicAttendance(
    entity: EmployeeAttendanceEntity,
    employee: EmployeeEntity | undefined,
  ): PublicAttendance {
    return {
      employeeId: formatEmployeeId(entity.employeeId),
      employeeName: employee?.name ?? 'Unknown',
      date: entity.date,
      status: entity.status,
      dayHours: Number(entity.dayHours),
      dayOtHours: Number(entity.dayOtHours),
      nightHours: Number(entity.nightHours),
      nightOtHours: Number(entity.nightOtHours),
      markedBy: entity.markedBy ?? undefined,
    };
  }

  private toPublicAdvance(entity: SalaryAdvanceEntity): PublicAdvance {
    return {
      id: entity.id,
      employeeId: formatEmployeeId(entity.employeeId),
      employeeName: entity.employeeName,
      amount: Number(entity.amount),
      reason: entity.reason,
      dateRequested: entity.dateRequested,
      status: entity.status,
      decidedBy: entity.decidedBy ?? undefined,
      decidedOn: entity.decidedOn ? entity.decidedOn.toISOString() : undefined,
    };
  }

  private toPublicPayroll(entity: PayrollRunEntity): PublicPayrollRow {
    return {
      id: entity.id,
      employeeId: formatEmployeeId(entity.employeeId),
      employeeName: entity.employeeName,
      period: entity.period,
      gross: Number(entity.gross),
      deductions: {
        advances: Number(entity.deductionsAdvances),
        other: Number(entity.deductionsOther),
      },
      status: entity.status,
      missingBank: entity.missingBank || undefined,
      shiftHours: {
        day: Number(entity.dayHours),
        dayOt: Number(entity.dayOtHours),
        night: Number(entity.nightHours),
        nightOt: Number(entity.nightOtHours),
      },
      rates: {
        day: Number(entity.dayRate),
        dayOt: Number(entity.dayOtRate),
        night: Number(entity.nightRate),
        nightOt: Number(entity.nightOtRate),
      },
    };
  }

  /** e.g. 'EMP-ADV-4821' — business key in the fixture's style, not a DB serial. */
  private generateAdvanceId(): string {
    const suffix =
      `${Date.now()}`.slice(-4) + String(Math.floor(Math.random() * 10));
    return `EMP-ADV-${suffix}`;
  }

  /** e.g. 'PR-4821' — business key in the fixture's style, not a DB serial. */
  private generatePayrollId(): string {
    const suffix =
      `${Date.now()}`.slice(-4) + String(Math.floor(Math.random() * 10));
    return `PR-${suffix}`;
  }
}
