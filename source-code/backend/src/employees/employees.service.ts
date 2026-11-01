import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AppRole } from '../auth/role-map';
import { AgentProvisioningService } from '../dispatch/agent-provisioning.service';
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
import { isAgentRole } from './employee-roles';
import {
  payslipAdvanceLines,
  planMonthDeductions,
  recoveryOf,
  remainingOf,
} from './advance-balance';
import { AdvanceRecoveryEntity } from './advance-recovery.entity';
import { PayrollSettingsService } from './payroll-settings.service';
import { hasNoBankDetails } from './payroll-view';
import { labelToKey } from '../reports/reports-map';
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
    private readonly audit: AuditService,
    private readonly agentProvisioning: AgentProvisioningService,
    @InjectRepository(AdvanceRecoveryEntity)
    private readonly recoveryRepo: Repository<AdvanceRecoveryEntity>,
    private readonly payrollSettings: PayrollSettingsService,
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

    // Employee self-service login is out of scope for the portal (see Claude.md) —
    // `hasLogin` is just a flag, EXCEPT for Tea Collecting Agents: registering one provisions
    // their mobile login and puts them on the dispatch board (see AgentProvisioningService).
    const becomesAgent = isAgentRole(dto.role);
    if (becomesAgent) {
      // fail BEFORE saving if the contact number already has a login
      await this.agentProvisioning.assertContactFree(dto.contact);
    }
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
      bankName: dto.bank || null,
      bankBranch: dto.branch || null,
      bankAccount: dto.account || null,
      paymentMethod: dto.paymentMethod ?? 'bank',
      dayRate: String(dto.dayRate ?? 0),
      dayOtRate: String(dto.dayOtRate ?? 0),
      nightRate: String(dto.nightRate ?? 0),
      nightOtRate: String(dto.nightOtRate ?? 0),
      hasLogin: dto.hasLogin,
      lastUpdatedBy: actor.name,
      lastUpdatedOn: new Date(),
    });

    const saved = await this.employeeRepo.save(employee);
    let initialPassword: string | null = null;
    if (becomesAgent) {
      try {
        ({ initialPassword } = await this.agentProvisioning.provision(saved));
      } catch (err) {
        // never leave a registered-but-unprovisioned agent behind
        await this.employeeRepo.delete({ id: saved.id });
        throw err;
      }
    }
    await this.audit.record(actor, {
      action: 'Registered employee',
      module: 'Employee',
      record: formatEmployeeId(saved.id),
      recordHref: `/employees/${formatEmployeeId(saved.id)}`,
      details: `${dto.name} — ${dto.role}${becomesAgent ? ' (mobile login created, on the dispatch board)' : ''}`,
    });
    return {
      ...this.toPublic(saved),
      ...(initialPassword ? { initialPassword } : {}),
    };
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

    const wasAgent = isAgentRole(employee.role) && employee.status === 'Active';
    const becomesAgent = isAgentRole(dto.role);
    if (!wasAgent && becomesAgent && employee.userId === null) {
      await this.agentProvisioning.assertContactFree(dto.contact);
    }

    employee.name = dto.name;
    employee.nic = dto.nic;
    employee.dob = dto.dob;
    employee.contact = dto.contact;
    employee.address = dto.address;
    employee.role = dto.role;
    employee.department = dto.department;
    employee.hireDate = dto.hireDate;
    employee.employmentType = dto.employmentType;
    employee.bankName = dto.bank || null;
    employee.bankBranch = dto.branch || null;
    employee.bankAccount = dto.account || null;
    employee.paymentMethod = dto.paymentMethod ?? employee.paymentMethod;
    if (dto.dayRate !== undefined) employee.dayRate = String(dto.dayRate);
    if (dto.dayOtRate !== undefined) employee.dayOtRate = String(dto.dayOtRate);
    if (dto.nightRate !== undefined) employee.nightRate = String(dto.nightRate);
    if (dto.nightOtRate !== undefined)
      employee.nightOtRate = String(dto.nightOtRate);
    employee.hasLogin = dto.hasLogin;
    employee.lastUpdatedBy = actor.name;
    employee.lastUpdatedOn = new Date();

    const saved = await this.employeeRepo.save(employee);

    // The role decides dispatch membership: becoming an agent provisions/re-enables their
    // identity; leaving the role frees their route and suspends the mobile login.
    let initialPassword: string | null = null;
    let details: string | undefined;
    if (becomesAgent && saved.status === 'Active') {
      if (!wasAgent) {
        ({ initialPassword } = await this.agentProvisioning.provision(saved));
        details = 'Now a Tea Collecting Agent — on the dispatch board';
      } else {
        await this.agentProvisioning.syncContact(saved);
      }
    } else if (wasAgent) {
      const freed = await this.agentProvisioning.deprovision(saved);
      details = `No longer a Tea Collecting Agent — removed from dispatch${freed.length ? `, ${freed.length} route(s) now unassigned` : ''}`;
    }
    await this.audit.record(actor, {
      action: 'Updated employee details',
      module: 'Employee',
      record: formatEmployeeId(saved.id),
      recordHref: `/employees/${formatEmployeeId(saved.id)}`,
      details,
    });
    return {
      ...this.toPublic(saved),
      ...(initialPassword ? { initialPassword } : {}),
    };
  }

  /** Administrator only (portal: `employees: 'approve'`). */
  async deactivate(id: string, actor: Actor): Promise<PublicEmployee> {
    this.assertIsAdmin(actor);
    const employee = await this.findEntity(id);
    const wasAgent = isAgentRole(employee.role);
    employee.status = 'Inactive';
    employee.lastUpdatedBy = actor.name;
    employee.lastUpdatedOn = new Date();
    const saved = await this.employeeRepo.save(employee);
    // an inactive agent leaves the dispatch board, loses their route and can't sign in
    const freed = wasAgent
      ? await this.agentProvisioning.deprovision(saved)
      : [];
    await this.audit.record(actor, {
      action: 'Deactivated employee',
      module: 'Employee',
      record: formatEmployeeId(saved.id),
      recordHref: `/employees/${formatEmployeeId(saved.id)}`,
      details: wasAgent
        ? `Agent removed from dispatch${freed.length ? `; ${freed.length} route(s) now unassigned` : ''}`
        : undefined,
    });
    return this.toPublic(saved);
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

    await this.audit.record(actor, {
      action: `Marked attendance for ${dto.records.length} employee(s)`,
      module: 'Employee',
      record: dto.date,
      recordHref: '/employees/attendance',
    });
  }

  async listAdvances(): Promise<PublicAdvance[]> {
    const advances = await this.advanceRepo.find({
      order: { dateRequested: 'DESC' },
    });
    const recoveries = await this.recoveryRepo.find();
    return advances.map((a) => this.toPublicAdvance(a, recoveries));
  }

  /** EMP-09/10 (request side) — Officer+ (portal: `advances: 'edit'`). No money moves yet. */
  async requestAdvance(
    dto: RequestAdvanceDto,
    actor: Actor,
  ): Promise<PublicAdvance> {
    this.assertCanWrite(actor);
    const employee = await this.findEntity(dto.employeeId);

    const advance = this.advanceRepo.create({
      id: this.businessId('EMP-ADV'),
      employeeId: employee.id,
      employeeName: employee.name,
      amount: String(dto.amount),
      reason: dto.reason,
      dateRequested: new Date().toISOString().slice(0, 10),
      status: 'Pending',
      deducted: false,
    });

    const saved = await this.advanceRepo.save(advance);
    await this.audit.record(actor, {
      action: `Requested advance Rs. ${dto.amount}`,
      module: 'Employee',
      record: saved.id,
      recordHref: '/employees/advances',
      details: `${employee.name} — ${dto.reason}`,
    });
    return this.toPublicAdvance(saved, []);
  }

  /** EMP-10 (approval side) — Officer or Administrator (portal: `advances: 'approve'` for both). */
  async decideAdvance(
    id: string,
    decision: 'approve' | 'reject',
    actor: Actor,
    reason?: string,
  ): Promise<PublicAdvance> {
    this.assertCanWrite(actor);
    const why = reason?.trim() ?? '';
    if (decision === 'reject' && !why) {
      throw new BadRequestException(
        'A reason is required to reject an advance.',
      );
    }
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
    advance.decisionReason = why || null;

    const saved = await this.advanceRepo.save(advance);
    await this.audit.record(actor, {
      action: `${decision === 'approve' ? 'Approved' : 'Rejected'} advance Rs. ${Number(advance.amount)}`,
      module: 'Employee',
      record: saved.id,
      recordHref: `/employees/advances/${saved.id}`,
      details: why ? `${advance.employeeName} — ${why}` : advance.employeeName,
    });
    return this.toPublicAdvance(
      saved,
      await this.recoveryRepo.find({ where: { advanceId: saved.id } }),
    );
  }

  async listPayroll(
    period?: string,
    status?: string,
  ): Promise<PublicPayrollRow[]> {
    // newest month first by the REAL month — the label sorts "September" before "July"
    const all = (await this.payrollRepo.find()).sort(
      (a, b) =>
        labelToKey(b.period).localeCompare(labelToKey(a.period)) ||
        a.employeeName.localeCompare(b.employeeName),
    );
    const filtered = all.filter((row) => {
      if (period && row.period !== period) return false;
      if (status && row.status !== status) return false;
      return true;
    });
    const ctx = {
      advances: await this.advanceRepo.find(),
      recoveries: await this.recoveryRepo.find(),
    };
    return filtered.map((r) => this.toPublicPayroll(r, ctx));
  }

  /**
   * EMP-11 — aggregates each Active employee's `employee_attendance` rows in
   * the period into hour buckets, multiplies by the employee's *current*
   * rates (snapshotted onto the row), and sums their Approved-but-not-yet-
   * deducted advances not reserved by another month into
   * `deductions.advances`, reserving them for this period. Upserts one row per
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
    const recoveries = await this.recoveryRepo.find();
    const { advanceDeductionCapPct } = await this.payrollSettings.get();

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

      // Salary-Advances-Addendum §9: deduct only what the gross allows (the cap % of gross, after
      // other deductions) — the rest is carried forward, so net is never below Rs. 0. The row
      // reserves what it deducts, so the same money is never counted in a second month.
      const deductionsOther = Number(existing?.deductionsOther ?? 0);
      const plan = planMonthDeductions(
        advances,
        recoveries,
        employee.id,
        dto.period,
        gross,
        deductionsOther,
        advanceDeductionCapPct,
      );
      const deductionsAdvances = plan.total;

      const missingBank = hasNoBankDetails(employee);

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
        const saved = await this.payrollRepo.save(existing);
        await this.reserveMonth(saved, plan.lines, advances, recoveries);
        results.push(saved);
      } else {
        const created = this.payrollRepo.create({
          id: this.businessId('PR'),
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
        const saved = await this.payrollRepo.save(created);
        await this.reserveMonth(saved, plan.lines, advances, recoveries);
        results.push(saved);
      }
    }

    await this.audit.record(actor, {
      action: 'Generated payroll',
      module: 'Employee',
      record: dto.period,
      recordHref: '/employees/payroll',
      details: `${results.length} employee row(s)`,
    });
    return results.map((r) =>
      this.toPublicPayroll(r, { advances, recoveries }),
    );
  }

  /**
   * EMP-12 — processes every currently-Pending row (optionally scoped to one
   * period). A bank-paid employee with no bank details (checked LIVE, not the
   * generate-time snapshot) blocks the run unless the officer excludes them
   * with a reason (Payroll-Month-History-Addendum, Part C) — their row stays
   * Pending with the reason, audited; fix the details and the next run picks
   * it up. Included rows' reserved advances flip to `deducted` (stamped with the
   * recovered month). No
   * per-transaction bank charge is applied (resolved 2026-07-26 — see
   * Claude.md's Payment calculation section). Officer+ (portal: `payroll: 'edit'`).
   */
  async processPayroll(
    dto: ProcessPayrollDto,
    actor: Actor,
  ): Promise<PublicPayrollRow[]> {
    this.assertCanWrite(actor);

    const all = await this.payrollRepo.find();
    const employees = new Map(
      (await this.employeeRepo.find()).map((e) => [e.id, e]),
    );
    const pending = all.filter(
      (r) => r.status === 'Pending' && (!dto.period || r.period === dto.period),
    );
    const blocked = pending.filter((r) =>
      hasNoBankDetails(employees.get(r.employeeId)),
    );
    const reasons = new Map(
      (dto.exclusions ?? []).map((x) => [x.employeeId, x.reason.trim()]),
    );
    const unexplained = blocked.filter(
      (r) => !reasons.get(formatEmployeeId(r.employeeId)),
    );
    if (unexplained.length > 0) {
      throw new ConflictException(
        `No bank details for ${unexplained.map((r) => r.employeeName).join(', ')} — ` +
          'add them, or exclude them from this run with a reason.',
      );
    }
    const eligible = pending.filter((r) => !blocked.includes(r));
    if (eligible.length === 0 && blocked.length === 0) {
      throw new ConflictException(
        'No pending payroll rows are ready to process.',
      );
    }

    // a row generated before the Rs. 0 floor could still be negative — never pay one out
    const negative = eligible.filter(
      (r) =>
        Number(r.gross) -
          Number(r.deductionsAdvances) -
          Number(r.deductionsOther) <
        0,
    );
    if (negative.length > 0) {
      throw new ConflictException(
        `Net payable is below Rs. 0 for ${negative.map((r) => r.employeeName).join(', ')} — ` +
          `recalculate ${dto.period ?? 'the month'} from attendance first.`,
      );
    }

    const now = new Date();
    for (const row of blocked) {
      row.missingBank = true;
      row.excludedReason = reasons.get(formatEmployeeId(row.employeeId))!;
      row.excludedBy = actor.name;
      row.excludedOn = now;
      await this.payrollRepo.save(row);
    }
    if (blocked.length > 0) {
      await this.audit.record(actor, {
        action: `Excluded ${blocked.length} employee(s) from payroll run`,
        module: 'Employee',
        record: dto.period ?? 'All pending periods',
        recordHref: '/employees/payroll',
        details: blocked
          .map((r) => `${r.employeeName}: ${r.excludedReason}`)
          .join('; '),
      });
    }

    const processed: PayrollRunEntity[] = [];
    const allAdvances = await this.advanceRepo.find();
    const allRecoveries = await this.recoveryRepo.find();

    for (const row of eligible) {
      row.status = 'Processed';
      row.processedBy = actor.name;
      row.processedOn = now;
      row.missingBank = false;
      row.excludedReason = null;
      row.excludedBy = null;
      row.excludedOn = null;
      processed.push(await this.payrollRepo.save(row));

      // only what this row reserved — an advance approved after Generate waits for the next run
      const own = new Set(
        allAdvances
          .filter((a) => a.employeeId === row.employeeId)
          .map((a) => a.id),
      );
      for (const rec of allRecoveries.filter(
        (r) =>
          r.kind === 'payroll' &&
          r.status === 'reserved' &&
          r.period === row.period &&
          own.has(r.advanceId),
      )) {
        rec.status = 'recovered';
        rec.payrollRunId = row.id;
        await this.recoveryRepo.save(rec);
        const advance = allAdvances.find((a) => a.id === rec.advanceId)!;
        if (remainingOf(advance, allRecoveries) === 0 && !advance.deducted) {
          advance.deducted = true; // fully recovered
          await this.advanceRepo.save(advance);
        }
      }
    }

    if (processed.length > 0) {
      await this.audit.record(actor, {
        action: 'Processed payroll run',
        module: 'Employee',
        record: dto.period ?? 'All pending periods',
        recordHref: '/employees/payroll',
        details: `${processed.length} employee(s)`,
      });
    }
    return processed.map((r) =>
      this.toPublicPayroll(r, {
        advances: allAdvances,
        recoveries: allRecoveries,
      }),
    );
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
      paymentMethod: entity.paymentMethod ?? 'bank',
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

  /**
   * Reserves `run`'s month of advance deductions (Salary-Advances-Addendum §9): one recovery row
   * per advance it plans for — `planned` vs `amount` is what's carried forward. Replaces this
   * month's earlier reservations (a Recalculate); recovered months are never touched.
   */
  private async reserveMonth(
    run: PayrollRunEntity,
    lines: { advanceId: string; planned: number; amount: number }[],
    advances: SalaryAdvanceEntity[],
    recoveries: AdvanceRecoveryEntity[],
  ): Promise<void> {
    const own = new Set(
      advances.filter((a) => a.employeeId === run.employeeId).map((a) => a.id),
    );
    const mine = recoveries.filter(
      (r) =>
        r.kind === 'payroll' &&
        r.period === run.period &&
        r.status === 'reserved' &&
        own.has(r.advanceId),
    );
    for (const old of mine.filter(
      (r) => !lines.some((l) => l.advanceId === r.advanceId),
    )) {
      await this.recoveryRepo.remove(old);
      recoveries.splice(recoveries.indexOf(old), 1);
    }
    for (const line of lines) {
      let rec = mine.find((r) => r.advanceId === line.advanceId);
      if (!rec) {
        rec = this.recoveryRepo.create({
          advanceId: line.advanceId,
          kind: 'payroll',
          period: run.period,
          status: 'reserved',
          reference: null,
          paidOn: null,
          recordedBy: null,
        });
        recoveries.push(rec);
      }
      rec.payrollRunId = run.id;
      rec.plannedAmount = String(line.planned);
      rec.amount = String(line.amount);
      Object.assign(rec, await this.recoveryRepo.save(rec));
    }
  }

  toPublicAdvance(
    entity: SalaryAdvanceEntity,
    recoveries: AdvanceRecoveryEntity[],
  ): PublicAdvance {
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
      decisionReason: entity.decisionReason ?? undefined,
      ...recoveryOf(entity, recoveries),
    };
  }

  private toPublicPayroll(
    entity: PayrollRunEntity,
    ctx?: {
      advances: SalaryAdvanceEntity[];
      recoveries: AdvanceRecoveryEntity[];
    },
  ): PublicPayrollRow {
    return {
      advanceLines: ctx
        ? payslipAdvanceLines(
            entity.employeeId,
            entity.period,
            ctx.advances,
            ctx.recoveries,
          )
        : undefined,
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
      excludedReason: entity.excludedReason ?? undefined,
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

  /** Business key with a fixture-style prefix, e.g. 'EMP-ADV-4821' / 'PR-4821' — not a DB serial. */
  private businessId(prefix: string): string {
    const suffix =
      `${Date.now()}`.slice(-4) + String(Math.floor(Math.random() * 10));
    return `${prefix}-${suffix}`;
  }
}
