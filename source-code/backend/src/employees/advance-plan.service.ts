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
import {
  earlyRepayable,
  lastProcessedKey,
  rescheduleError,
} from '../advances/installments';
import { keyToLabel } from '../reports/reports-map';
import { remainingOf } from './advance-balance';
import { AdvanceRecoveryEntity } from './advance-recovery.entity';
import { AdvanceRescheduleEntity } from './advance-reschedule.entity';
import { monthsForInstallment, selfApprovalCheck } from './advance-schedule';
import type {
  CashRepaymentDto,
  DecideRescheduleDto,
  RescheduleAdvanceDto,
} from './dto/advance-change.dto';
import type { PublicAdvance } from './employee-map';
import { EmployeeEntity } from './employee.entity';
import { type Actor, EmployeesService, planText } from './employees.service';
import { PayrollSettingsService } from './payroll-settings.service';
import { SalaryAdvanceEntity } from './salary-advance.entity';

export interface PublicReschedule {
  id: number;
  installmentAmount: number;
  startPeriod: string;
  note: string;
  status: AdvanceRescheduleEntity['status'];
  requestedBy: string | null;
  decidedBy: string | null;
  decidedOn: string | null;
  decisionReason: string | null;
  requestedOn: string;
}

/**
 * Changes to an APPROVED advance (Salary-Advances-Addendum §10): a reschedule (new installment /
 * start month — needs someone else's approval) and an early cash repayment. Processed payroll
 * months are recovery rows and are never touched; every change is audited.
 */
@Injectable()
export class AdvancePlanService {
  constructor(
    @InjectRepository(SalaryAdvanceEntity)
    private readonly advanceRepo: Repository<SalaryAdvanceEntity>,
    @InjectRepository(AdvanceRecoveryEntity)
    private readonly recoveryRepo: Repository<AdvanceRecoveryEntity>,
    @InjectRepository(AdvanceRescheduleEntity)
    private readonly rescheduleRepo: Repository<AdvanceRescheduleEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepo: Repository<EmployeeEntity>,
    private readonly employees: EmployeesService,
    private readonly payrollSettings: PayrollSettingsService,
    private readonly audit: AuditService,
  ) {}

  async reschedules(advanceId: string): Promise<PublicReschedule[]> {
    return (await this.rescheduleRepo.find({ where: { advanceId } }))
      .filter((r) => r.advanceId === advanceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => toPublicReschedule(r));
  }

  /** Ask to change an approved plan. Applies only from a month not yet processed. */
  async requestReschedule(
    id: string,
    dto: RescheduleAdvanceDto,
    actor: Actor,
  ): Promise<PublicReschedule> {
    this.assertCanWrite(actor);
    const { advance, recoveries } = await this.approved(id);
    const remaining = remainingOf(advance, recoveries);
    if (remaining <= 0) {
      throw new ConflictException(`Advance "${id}" is already recovered.`);
    }
    const pending = (
      await this.rescheduleRepo.find({ where: { advanceId: id } })
    ).find((r) => r.advanceId === id && r.status === 'Pending');
    if (pending) {
      throw new ConflictException(
        'A reschedule is already waiting for approval.',
      );
    }
    const { maxInstallmentMonths } = await this.payrollSettings.get();
    const error = rescheduleError(
      remaining,
      dto.installmentAmount,
      maxInstallmentMonths,
      dto.startMonth,
      lastProcessedKey(advance, recoveries),
    );
    if (error) throw new BadRequestException(error);
    const saved = await this.rescheduleRepo.save(
      this.rescheduleRepo.create({
        advanceId: id,
        installmentAmount: String(dto.installmentAmount),
        startPeriod: keyToLabel(dto.startMonth),
        note: dto.note.trim(),
        status: 'Pending',
        requestedByUserId: actor.sub ?? null,
        requestedByName: actor.name,
        decidedBy: null,
        decidedOn: null,
        decisionReason: null,
      }),
    );
    await this.audit.record(actor, {
      action: 'Requested advance reschedule',
      module: 'Employee',
      record: id,
      recordHref: `/employees/advances/${id}`,
      details: `${advance.employeeName} — Rs. ${dto.installmentAmount} a month from ${saved.startPeriod}: ${saved.note}`,
    });
    return toPublicReschedule(saved);
  }

  /** Approve / reject a reschedule — never by the person who asked for it, nor the employee. */
  async decideReschedule(
    id: string,
    rescheduleId: number,
    dto: DecideRescheduleDto,
    actor: Actor,
  ): Promise<PublicAdvance> {
    this.assertCanWrite(actor);
    const { advance, recoveries } = await this.approved(id);
    const r = (
      await this.rescheduleRepo.find({ where: { advanceId: id } })
    ).find((x) => x.id === rescheduleId);
    if (!r) throw new NotFoundException(`No reschedule ${rescheduleId}.`);
    if (r.status !== 'Pending') {
      throw new ConflictException('This reschedule has already been decided.');
    }
    const why = dto.reason?.trim() ?? '';
    if (dto.decision === 'reject' && !why) {
      throw new BadRequestException(
        'A reason is required to reject a reschedule.',
      );
    }
    if (dto.decision === 'approve') {
      const employee = await this.employeeRepo.findOne({
        where: { id: advance.employeeId },
      });
      const check = selfApprovalCheck(
        r.requestedByUserId,
        employee?.nic ?? null,
        actor,
      );
      if (check.blocked) {
        throw new ForbiddenException(
          check.reason?.replace('this advance', 'this reschedule') ?? undefined,
        );
      }
      const remaining = remainingOf(advance, recoveries);
      advance.installmentAmount = r.installmentAmount;
      advance.startPeriod = r.startPeriod;
      advance.installmentMonths = monthsForInstallment(
        remaining,
        Number(r.installmentAmount),
      );
      await this.advanceRepo.save(advance);
    }
    r.status = dto.decision === 'approve' ? 'Approved' : 'Rejected';
    r.decidedBy = actor.name;
    r.decidedOn = new Date();
    r.decisionReason = why || null;
    await this.rescheduleRepo.save(r);
    await this.audit.record(actor, {
      action: `${r.status} advance reschedule`,
      module: 'Employee',
      record: id,
      recordHref: `/employees/advances/${id}`,
      details:
        `${advance.employeeName} — ` +
        planText({
          installment: Number(r.installmentAmount),
          months: advance.installmentMonths ?? 1,
          startPeriod: r.startPeriod,
        }) +
        (why ? `: ${why}` : ''),
    });
    return this.employees.toPublicAdvance(advance, recoveries);
  }

  /** An early repayment in cash — reduces the balance and so shortens the schedule. */
  async recordCashRepayment(
    id: string,
    dto: CashRepaymentDto,
    actor: Actor,
  ): Promise<PublicAdvance> {
    this.assertCanWrite(actor);
    const { advance, recoveries } = await this.approved(id);
    // what isn't already earmarked by a Pending payroll month
    const payable = earlyRepayable(advance, recoveries);
    if (dto.amount > payable) {
      throw new BadRequestException(
        payable <= 0
          ? 'Nothing is left to repay outside payroll.'
          : `At most Rs. ${payable.toLocaleString('en-US')} can be repaid — the rest is already in a Pending payroll month.`,
      );
    }
    const saved = await this.recoveryRepo.save(
      this.recoveryRepo.create({
        advanceId: id,
        kind: 'cash',
        period: null,
        payrollRunId: null,
        status: 'recovered',
        plannedAmount: '0',
        amount: String(dto.amount),
        reference: dto.reference.trim(),
        paidOn: dto.paidOn.slice(0, 10),
        recordedBy: actor.name,
      }),
    );
    recoveries.push(saved);
    if (remainingOf(advance, recoveries) === 0 && !advance.deducted) {
      advance.deducted = true;
      await this.advanceRepo.save(advance);
    }
    await this.audit.record(actor, {
      action: `Recorded cash repayment Rs. ${dto.amount}`,
      module: 'Employee',
      record: id,
      recordHref: `/employees/advances/${id}`,
      details: `${advance.employeeName} — ${saved.reference}, paid ${saved.paidOn}`,
    });
    return this.employees.toPublicAdvance(advance, recoveries);
  }

  private async approved(id: string): Promise<{
    advance: SalaryAdvanceEntity;
    recoveries: AdvanceRecoveryEntity[];
  }> {
    const advance = await this.advanceRepo.findOne({ where: { id } });
    if (!advance) throw new NotFoundException(`No advance request "${id}".`);
    if (advance.status !== 'Approved') {
      throw new ConflictException(`Advance "${id}" isn't approved.`);
    }
    const recoveries = (
      await this.recoveryRepo.find({ where: { advanceId: id } })
    ).filter((r) => r.advanceId === id);
    return { advance, recoveries };
  }

  private assertCanWrite(actor: Actor): void {
    if (actor.role === 'Manager') {
      throw new ForbiddenException(
        'Managers have read-only access to salary advances.',
      );
    }
  }
}

function toPublicReschedule(r: AdvanceRescheduleEntity): PublicReschedule {
  return {
    id: r.id,
    installmentAmount: Number(r.installmentAmount),
    startPeriod: r.startPeriod,
    note: r.note,
    status: r.status,
    requestedBy: r.requestedByName,
    decidedBy: r.decidedBy,
    decidedOn: r.decidedOn ? r.decidedOn.toISOString() : null,
    decisionReason: r.decisionReason,
    requestedOn: r.createdAt.toISOString(),
  };
}
