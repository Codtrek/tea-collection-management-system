import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  earlyRepayable,
  lastProcessedKey,
  monthsForInstallment,
  planText,
  rescheduleError,
} from '../advances/installments';
import { AuditService } from '../audit/audit.service';
import { keyToLabel } from '../reports/reports-map';
import type {
  DecideRescheduleDto,
  EstateRepaymentDto,
  RescheduleAdvanceDto,
} from './dto/estate-advance-change.dto';
import { dbStatusFor, remainingOf } from './estate-advance-balance';
import { EstateAdvanceRecoveryEntity } from './estate-advance-recovery.entity';
import { EstateAdvanceRescheduleEntity } from './estate-advance-reschedule.entity';
import { EstateAdvanceSettingsService } from './estate-advance-settings.service';
import { EstateAdvanceEntity } from './estate-advance.entity';
import { formatEstateId } from './estate-map';
import { type Actor, EstatesService } from './estates.service';

export interface PublicEstateReschedule {
  id: number;
  installmentAmount: number;
  startPeriod: string;
  note: string;
  status: EstateAdvanceRescheduleEntity['status'];
  requestedBy: string | null;
  decidedBy: string | null;
  decidedOn: string | null;
  decisionReason: string | null;
  requestedOn: string;
}

/**
 * Changes to an estate advance after it's issued (Estate-Owner-Advances-Addendum §4) — the same
 * rules as salary advances (shared ../advances/installments.ts): a reschedule (new installment /
 * start period) needs someone else's approval and never touches a processed period; an early
 * repayment in cash or by bank transfer reduces the balance and so shortens the schedule.
 * Every change is audited.
 */
@Injectable()
export class EstateAdvancePlanService {
  constructor(
    @InjectRepository(EstateAdvanceEntity)
    private readonly advanceRepo: Repository<EstateAdvanceEntity>,
    @InjectRepository(EstateAdvanceRecoveryEntity)
    private readonly recoveryRepo: Repository<EstateAdvanceRecoveryEntity>,
    @InjectRepository(EstateAdvanceRescheduleEntity)
    private readonly rescheduleRepo: Repository<EstateAdvanceRescheduleEntity>,
    private readonly estates: EstatesService,
    private readonly settings: EstateAdvanceSettingsService,
    private readonly audit: AuditService,
  ) {}

  async reschedules(advanceId: string): Promise<PublicEstateReschedule[]> {
    return (await this.rescheduleRepo.find({ where: { advanceId } }))
      .filter((r) => r.advanceId === advanceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toPublicReschedule);
  }

  async requestReschedule(
    id: string,
    dto: RescheduleAdvanceDto,
    actor: Actor,
  ): Promise<PublicEstateReschedule> {
    this.estates.assertCanWrite(actor);
    const { advance, recoveries } = await this.open(id);
    const pending = (
      await this.rescheduleRepo.find({ where: { advanceId: id } })
    ).find((r) => r.advanceId === id && r.status === 'Pending');
    if (pending) {
      throw new ConflictException(
        'A reschedule is already waiting for approval.',
      );
    }
    const { maxInstallmentMonths } = await this.settings.get();
    const error = rescheduleError(
      remainingOf(advance, recoveries),
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
      action: 'Requested estate advance reschedule',
      module: 'Estate Owner',
      record: id,
      recordHref: `/estates/advances/${id}`,
      details: `${advance.estateName} — Rs. ${dto.installmentAmount} a period from ${saved.startPeriod}: ${saved.note}`,
    });
    return toPublicReschedule(saved);
  }

  /** Approve / reject — never by the person who asked for it (server-side). */
  async decideReschedule(
    id: string,
    rescheduleId: number,
    dto: DecideRescheduleDto,
    actor: Actor,
  ): Promise<PublicEstateReschedule> {
    this.estates.assertCanWrite(actor);
    const { advance, recoveries } = await this.open(id);
    const r = (
      await this.rescheduleRepo.find({ where: { advanceId: id } })
    ).find((x) => x.id === rescheduleId);
    if (!r) throw new NotFoundException(`No reschedule ${rescheduleId}.`);
    if (r.status !== 'Pending') {
      throw new ConflictException('This reschedule has already been decided.');
    }
    if (isRequester(r, actor)) {
      throw new ForbiddenException(
        'You asked for this reschedule — someone else has to decide it.',
      );
    }
    const why = dto.reason?.trim() ?? '';
    if (dto.decision === 'reject' && !why) {
      throw new BadRequestException(
        'A reason is required to reject a reschedule.',
      );
    }
    if (dto.decision === 'approve') {
      // the new plan covers what's left; processed periods are recovery rows and stay as they are
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
    const saved = await this.rescheduleRepo.save(r);
    await this.audit.record(actor, {
      action: `${r.status} estate advance reschedule`,
      module: 'Estate Owner',
      record: id,
      recordHref: `/estates/advances/${id}`,
      details:
        `${advance.estateName} — ` +
        planText({
          installment: Number(r.installmentAmount),
          months: advance.installmentMonths ?? 1,
          startPeriod: r.startPeriod,
        }) +
        (why ? `: ${why}` : ''),
    });
    return toPublicReschedule(saved);
  }

  /** An early repayment in cash or by bank transfer — reduces the balance, shortens the schedule. */
  async recordRepayment(
    id: string,
    dto: EstateRepaymentDto,
    actor: Actor,
  ): Promise<{ remaining: number }> {
    this.estates.assertCanWrite(actor);
    const { advance, recoveries } = await this.open(id);
    const payable = earlyRepayable(advance, recoveries);
    if (dto.amount > payable) {
      throw new BadRequestException(
        payable <= 0
          ? 'Nothing is left to repay.'
          : `At most Rs. ${payable.toLocaleString('en-US')} can be repaid.`,
      );
    }
    const saved = await this.recoveryRepo.save(
      this.recoveryRepo.create({
        advanceId: id,
        settlementId: null,
        kind: dto.kind,
        period: null,
        plannedAmount: '0',
        amount: String(dto.amount),
        status: 'recovered',
        reference: dto.reference.trim(),
        paidOn: dto.paidOn.slice(0, 10),
        recordedBy: actor.name,
        recoveredAt: new Date(`${dto.paidOn.slice(0, 10)}T00:00:00`),
      }),
    );
    recoveries.push(saved);
    const status = dbStatusFor(advance, recoveries);
    if (status !== advance.status) {
      advance.status = status;
      await this.advanceRepo.save(advance);
    }
    await this.audit.record(actor, {
      action: `Recorded ${dto.kind} repayment Rs. ${dto.amount}`,
      module: 'Estate Owner',
      record: id,
      recordHref: `/estates/${formatEstateId(advance.estateId)}`,
      details: `${advance.estateName} — ${saved.reference}, paid ${saved.paidOn}`,
    });
    return { remaining: remainingOf(advance, recoveries) };
  }

  private async open(id: string): Promise<{
    advance: EstateAdvanceEntity;
    recoveries: EstateAdvanceRecoveryEntity[];
  }> {
    const advance = await this.advanceRepo.findOne({ where: { id } });
    if (!advance) throw new NotFoundException(`No estate advance "${id}".`);
    const recoveries = (
      await this.recoveryRepo.find({ where: { advanceId: id } })
    ).filter((r) => r.advanceId === id);
    if (remainingOf(advance, recoveries) <= 0) {
      throw new ConflictException(`Advance "${id}" is already recovered.`);
    }
    return { advance, recoveries };
  }
}

/** Same person by user id, or — for a row with no id — by name. */
function isRequester(r: EstateAdvanceRescheduleEntity, actor: Actor): boolean {
  if (r.requestedByUserId !== null && actor.sub !== undefined) {
    return r.requestedByUserId === actor.sub;
  }
  return !!r.requestedByName && r.requestedByName === actor.name;
}

function toPublicReschedule(
  r: EstateAdvanceRescheduleEntity,
): PublicEstateReschedule {
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
