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
import { UsersService } from '../users/users.service';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { SettlementAdjustmentEntity } from '../collections/settlement-adjustment.entity';
import { keyToLabel, labelToKey } from '../reports/reports-map';
import {
  addMonths,
  monthsForInstallment,
  planError,
  planText,
} from '../advances/installments';
import { localDate } from '../dispatch/dispatch-map';
import { dbStatusFor } from './estate-advance-balance';
import { EstateAdvanceSettingsService } from './estate-advance-settings.service';
import { allocateStoredAdvanceDeduction } from './settlement-deductions';
import { EstateAdvanceRecoveryEntity } from './estate-advance-recovery.entity';
import { EstateAdvanceEntity } from './estate-advance.entity';
import { EstateDocumentEntity } from './estate-document.entity';
import {
  formatEstateId,
  parseEstateId,
  toAppAdvanceStatus,
  toAppEstateStatus,
  toAppSettlementStatus,
  type PublicAdvance,
  type PublicEstate,
  type PublicSettlement,
} from './estate-map';
import { EstateOwnerEntity } from './estate-owner.entity';
import { EstateEntity } from './estate.entity';
import { CreateEstateDto } from './dto/create-estate.dto';
import { IssueAdvanceDto } from './dto/issue-advance.dto';
import { UpdateEstateDto } from './dto/update-estate.dto';
import { RouteEntity } from './route.entity';
import { SettlementEntity } from './settlement.entity';
import { payableDeliveries } from './settlement-calc';

export interface Actor {
  name: string;
  role: AppRole;
  /** users.id — for the no-self-approval check on reschedules */
  sub?: number;
}

@Injectable()
export class EstatesService {
  constructor(
    @InjectRepository(EstateEntity)
    private readonly estateRepo: Repository<EstateEntity>,
    @InjectRepository(EstateOwnerEntity)
    private readonly ownerRepo: Repository<EstateOwnerEntity>,
    @InjectRepository(EstateDocumentEntity)
    private readonly documentRepo: Repository<EstateDocumentEntity>,
    @InjectRepository(EstateAdvanceEntity)
    private readonly advanceRepo: Repository<EstateAdvanceEntity>,
    @InjectRepository(SettlementEntity)
    private readonly settlementRepo: Repository<SettlementEntity>,
    @InjectRepository(RouteEntity)
    private readonly routeRepo: Repository<RouteEntity>,
    @InjectRepository(CollectionRecordEntity)
    private readonly collectionRepo: Repository<CollectionRecordEntity>,
    @InjectRepository(SettlementAdjustmentEntity)
    private readonly adjustmentRepo: Repository<SettlementAdjustmentEntity>,
    @InjectRepository(EstateAdvanceRecoveryEntity)
    private readonly recoveryRepo: Repository<EstateAdvanceRecoveryEntity>,
    private readonly usersService: UsersService,
    private readonly audit: AuditService,
    private readonly advanceSettings: EstateAdvanceSettingsService,
  ) {}

  async findAll(): Promise<PublicEstate[]> {
    const estates = await this.estateRepo.find({ order: { name: 'ASC' } });
    return this.toPublicMany(estates);
  }

  async findById(id: string): Promise<PublicEstate> {
    const estate = await this.findEntity(id);
    return this.toPublicOne(estate);
  }

  /** EST-02 — Administrator only. Route is system-assigned, never submitted by the caller. */
  async create(dto: CreateEstateDto, actor: Actor): Promise<PublicEstate> {
    this.assertIsAdmin(actor);

    const ownerUser = await this.usersService.createUser(
      dto.contact,
      'estate_owner',
    );
    let owner = await this.ownerRepo.findOne({
      where: { userId: ownerUser.id },
    });
    if (owner) {
      owner.name = dto.ownerName;
      owner.nic = dto.nic;
      owner.contact = dto.contact;
      owner.email = dto.email ?? null;
    } else {
      owner = this.ownerRepo.create({
        userId: ownerUser.id,
        name: dto.ownerName,
        nic: dto.nic,
        contact: dto.contact,
        email: dto.email ?? null,
      });
    }
    owner = await this.ownerRepo.save(owner);

    const route = await this.assignRoute();
    const now = new Date();

    const estate = this.estateRepo.create({
      ownerId: owner.id,
      name: dto.estateName,
      location: dto.location,
      address: dto.address,
      routeId: route.id,
      routeName: route.name,
      selfDelivery: dto.selfDelivery,
      status: 'active',
      ytdDeliveriesKg: '0',
      bankName: dto.bank || null,
      bankBranch: dto.branch || null,
      bankAccount: dto.account || null,
      paymentMethod: dto.paymentMethod ?? 'bank',
      lastUpdatedBy: actor.name,
      lastUpdatedOn: now,
    });

    const saved = await this.estateRepo.save(estate);
    await this.audit.record(actor, {
      action: 'Registered estate',
      module: 'Estate Owner',
      record: formatEstateId(saved.id),
      recordHref: `/estates/${formatEstateId(saved.id)}`,
      details: `${dto.estateName} — ${dto.ownerName}`,
    });
    return this.toPublicOne(saved);
  }

  /** EST-04 — same fields as EST-02. Route stays read-only regardless of what's sent. */
  async update(
    id: string,
    dto: UpdateEstateDto,
    actor: Actor,
  ): Promise<PublicEstate> {
    this.assertCanWrite(actor);
    const estate = await this.findEntity(id);

    const owner = await this.ownerRepo.findOne({
      where: { id: estate.ownerId },
    });
    if (owner) {
      owner.name = dto.ownerName;
      owner.nic = dto.nic;
      owner.contact = dto.contact;
      owner.email = dto.email ?? null;
      await this.ownerRepo.save(owner);
    }

    estate.name = dto.estateName;
    estate.location = dto.location;
    estate.address = dto.address;
    estate.selfDelivery = dto.selfDelivery;
    estate.bankName = dto.bank || null;
    estate.bankBranch = dto.branch || null;
    estate.bankAccount = dto.account || null;
    estate.paymentMethod = dto.paymentMethod ?? estate.paymentMethod;
    estate.lastUpdatedBy = actor.name;
    estate.lastUpdatedOn = new Date();

    const saved = await this.estateRepo.save(estate);
    await this.audit.record(actor, {
      action: 'Updated estate details',
      module: 'Estate Owner',
      record: formatEstateId(saved.id),
      recordHref: `/estates/${formatEstateId(saved.id)}`,
    });
    return this.toPublicOne(saved);
  }

  /** Administrator only (portal: `estateOwners: 'approve'`). */
  async deactivate(id: string, actor: Actor): Promise<PublicEstate> {
    this.assertIsAdmin(actor);
    const estate = await this.findEntity(id);
    estate.status = 'inactive';
    estate.lastUpdatedBy = actor.name;
    estate.lastUpdatedOn = new Date();
    const saved = await this.estateRepo.save(estate);
    await this.audit.record(actor, {
      action: 'Deactivated estate',
      module: 'Estate Owner',
      record: formatEstateId(saved.id),
      recordHref: `/estates/${formatEstateId(saved.id)}`,
    });
    return this.toPublicOne(saved);
  }

  /**
   * EST-06 — money moves immediately; deducted by settlements per the repayment plan
   * (Estate-Owner-Advances-Addendum §4): one deduction (default) or one installment a period,
   * from `startMonth` (default: next calendar month). Never to an inactive estate.
   */
  async issueAdvance(
    dto: IssueAdvanceDto,
    actor: Actor,
  ): Promise<PublicAdvance> {
    this.assertCanWrite(actor);
    const estate = await this.findEntity(dto.estateId);
    if (estate.status !== 'active') {
      throw new ConflictException(
        `${estate.name} is inactive — inactive estates can't receive advances.`,
      );
    }
    const { maxInstallmentMonths } = await this.advanceSettings.get();
    const installment = dto.installmentAmount ?? dto.amount;
    const error = planError(dto.amount, installment, maxInstallmentMonths);
    if (error) throw new BadRequestException(error);
    const thisMonth = localDate(new Date()).slice(0, 7);
    const startKey = dto.startMonth ?? addMonths(thisMonth, 1);
    if (startKey < thisMonth) {
      throw new BadRequestException(
        'The repayment can’t start in a month that has already passed.',
      );
    }
    const plan = {
      installment,
      months: monthsForInstallment(dto.amount, installment),
      startPeriod: keyToLabel(startKey),
    };

    const advance = this.advanceRepo.create({
      id: this.generateAdvanceId(),
      estateId: estate.id,
      estateName: estate.name,
      amount: String(dto.amount),
      reason: dto.reason,
      dateIssued: new Date().toISOString().slice(0, 10),
      issuedBy: actor.name,
      status: 'pending_deduction',
      installmentAmount: String(plan.installment),
      installmentMonths: plan.months,
      startPeriod: plan.startPeriod,
    });

    const saved = await this.advanceRepo.save(advance);
    await this.audit.record(actor, {
      action: `Issued advance Rs. ${dto.amount}`,
      module: 'Estate Owner',
      record: saved.id,
      recordHref: `/estates/${formatEstateId(estate.id)}`,
      details: `${estate.name} — ${dto.reason} — ${planText(plan)}`,
    });
    return this.toPublicAdvance(saved);
  }

  async listSettlements(): Promise<PublicSettlement[]> {
    const settlements = await this.settlementRepo.find({
      order: { period: 'DESC' },
    });
    // A pending settlement previews the corrections it WILL carry; a processed one shows
    // what it carried (stored on the row).
    const pending = (await this.adjustmentRepo.find()).filter(
      (a) => a.status === 'pending',
    );
    return settlements.map((s) => {
      const out = this.toPublicSettlement(s);
      if (s.status === 'pending') {
        out.adjustment = pending
          .filter((a) => a.estateId === s.estateId)
          .reduce((sum, a) => sum + Number(a.amountRs), 0);
      }
      return out;
    });
  }

  /**
   * EST-08 — processes every currently-Pending settlement of `period` (or of
   * every period when omitted) in one run (matches the portal's single
   * "Process N Settlements" action; there's no per-settlement targeting). Missing-bank estates are excluded, not
   * blocked (UC-054) — flip their bank details and they're picked up next
   * run. Included estates' pending advances flip to Deducted. No
   * per-transaction bank charge is applied (resolved 2026-07-26 — see
   * Claude.md's Payment calculation section).
   */
  async processSettlements(
    actor: Actor,
    period?: string,
  ): Promise<PublicSettlement[]> {
    this.assertCanWrite(actor);

    const all = await this.settlementRepo.find();
    // Settlement-Period-View-Addendum: the period view processes ITS month only; no period =
    // every pending row, as before.
    const eligible = all.filter(
      (s) =>
        s.status === 'pending' &&
        !s.missingBank &&
        (!period || s.period === period),
    );

    // oldest period first, so an estate's advance balances recover month by month
    eligible.sort((a, b) =>
      labelToKey(a.period).localeCompare(labelToKey(b.period)),
    );

    if (eligible.length === 0) {
      throw new ConflictException(
        'No pending settlements are ready to process.',
      );
    }

    const now = new Date();
    const processed: SettlementEntity[] = [];
    const allAdvances = await this.advanceRepo.find();
    const allRecoveries = await this.recoveryRepo.find();
    const pendingAdjustments = (await this.adjustmentRepo.find()).filter(
      (a) => a.status === 'pending',
    );
    const allDeliveries = await this.collectionRepo.find({
      where: { status: 'confirmed' },
    });
    let skippedOpen = 0;
    let linked = 0;
    let unallocatedRs = 0;

    for (const settlement of eligible) {
      // Signed corrections on deliveries paid in EARLIER settlements ride along here — the
      // earlier payment is never rewritten, the difference is carried forward.
      const carried = pendingAdjustments.filter(
        (a) => a.estateId === settlement.estateId,
      );
      settlement.adjustmentAmount = String(
        Math.round(carried.reduce((s, a) => s + Number(a.amountRs), 0) * 100) / 100,
      );
      settlement.status = 'processed';
      settlement.processedBy = actor.name;
      settlement.processedOn = now;
      processed.push(await this.settlementRepo.save(settlement));
      for (const a of carried) {
        a.status = 'applied';
        a.appliedSettlementId = settlement.id;
        await this.adjustmentRepo.save(a);
      }

      // Link the deliveries this settlement pays for: same estate, same month, not already
      // paid — and only those past the correction window. OPEN ones are skipped.
      const monthKey = labelToKey(settlement.period);
      const candidates = allDeliveries.filter(
        (d) =>
          d.estateId === settlement.estateId &&
          !d.settlementId &&
          monthKey !== '' &&
          d.collectionDate.slice(0, 7) === monthKey,
      );
      const payable = payableDeliveries(candidates, now);
      skippedOpen += candidates.length - payable.length;
      for (const d of payable) {
        d.settlementId = settlement.id;
        await this.collectionRepo.save(d);
        linked += 1;
      }

      // Estate-Owner-Advances-Addendum §4: split the advance deduction this settlement actually
      // took (its stored advance_deduction — there's no generator yet) across the estate's open
      // advances: due installments first, oldest first; any excess pays down the oldest balances.
      // One recovery row per advance (planned vs taken — the rest is carried forward). An
      // advance is Deducted only once its balance reaches Rs. 0. Settlement amounts never change.
      const open = allAdvances.filter(
        (a) => a.estateId === settlement.estateId && a.status !== 'deducted',
      );
      const { lines, unallocated } = allocateStoredAdvanceDeduction(
        Number(settlement.advanceDeduction),
        open,
        allRecoveries,
        settlement.period,
      );
      unallocatedRs += unallocated;
      for (const line of lines) {
        allRecoveries.push(
          await this.recoveryRepo.save(
            this.recoveryRepo.create({
              advanceId: line.advanceId,
              settlementId: settlement.id,
              kind: 'settlement',
              period: settlement.period,
              plannedAmount: String(line.planned),
              amount: String(line.amount),
              status: 'recovered',
              reference: null,
              paidOn: null,
              recordedBy: actor.name,
              recoveredAt: now,
            }),
          ),
        );
        const advance = open.find((a) => a.id === line.advanceId)!;
        const status = dbStatusFor(advance, allRecoveries);
        if (status !== advance.status) {
          advance.status = status;
          await this.advanceRepo.save(advance);
        }
      }
    }

    await this.audit.record(actor, {
      action: 'Processed settlement run',
      module: 'Estate Owner',
      record: `${processed.length} settlement(s)${period ? ` · ${period}` : ''}`,
      recordHref: '/estates/settlements',
      details:
        `${linked} deliver${linked === 1 ? 'y' : 'ies'} linked as paid` +
        (skippedOpen > 0
          ? `; ${skippedOpen} still inside the correction window and not included`
          : '') +
        (unallocatedRs > 0
          ? `; Rs. ${Math.round(unallocatedRs).toLocaleString('en-US')} of advance deductions matched no open advance`
          : ''),
    });
    return processed.map((s) => this.toPublicSettlement(s));
  }

  private async findEntity(formattedId: string): Promise<EstateEntity> {
    const id = parseEstateId(formattedId);
    const estate = Number.isNaN(id)
      ? null
      : await this.estateRepo.findOne({ where: { id } });
    if (!estate) {
      throw new NotFoundException(`No estate "${formattedId}".`);
    }
    return estate;
  }

  /** Register/deactivate are Administrator-only (portal: `estateOwners: 'approve'`). */
  private assertIsAdmin(actor: Actor): void {
    if (actor.role !== 'Administrator') {
      throw new ForbiddenException(
        'Only an Administrator can register or deactivate an estate.',
      );
    }
  }

  /** Manager has read-only access to Estates + Payments (Administrator/Officer can write). */
  assertCanWrite(actor: Actor): void {
    if (actor.role === 'Manager') {
      throw new ForbiddenException(
        'Managers have read-only access to estates and payments.',
      );
    }
  }

  /**
   * System route assignment (EST-02: "auto-assigned by the system", never
   * manually picked). No geo data exists to route by location yet, so this
   * picks the least-loaded route — deterministic and keeps routes balanced.
   */
  private async assignRoute(): Promise<RouteEntity> {
    const routes = await this.routeRepo.find();
    if (routes.length === 0) {
      throw new NotFoundException(
        'No collection routes are configured — cannot register an estate yet.',
      );
    }
    const estates = await this.estateRepo.find();
    const counts = new Map<number, number>();
    for (const e of estates) {
      if (e.routeId !== null) {
        counts.set(e.routeId, (counts.get(e.routeId) ?? 0) + 1);
      }
    }
    return routes.reduce((least, r) =>
      (counts.get(r.id) ?? 0) < (counts.get(least.id) ?? 0) ? r : least,
    );
  }

  private async toPublicMany(estates: EstateEntity[]): Promise<PublicEstate[]> {
    const owners = await this.ownerRepo.find();
    const documents = await this.documentRepo.find();
    return estates.map((e) =>
      this.toPublic(
        e,
        owners.find((o) => o.id === e.ownerId),
        documents.filter((d) => d.estateId === e.id),
      ),
    );
  }

  private async toPublicOne(estate: EstateEntity): Promise<PublicEstate> {
    const owners = await this.ownerRepo.find();
    const documents = await this.documentRepo.find();
    return this.toPublic(
      estate,
      owners.find((o) => o.id === estate.ownerId),
      documents.filter((d) => d.estateId === estate.id),
    );
  }

  private toPublic(
    estate: EstateEntity,
    owner: EstateOwnerEntity | undefined,
    documents: EstateDocumentEntity[],
  ): PublicEstate {
    return {
      id: formatEstateId(estate.id),
      estateName: estate.name,
      ownerName: owner?.name ?? 'Unknown',
      nic: owner?.nic ?? '',
      contact: owner?.contact ?? '',
      email: owner?.email ?? undefined,
      location: estate.location,
      address: estate.address ?? '',
      route: estate.routeName ?? '',
      selfDelivery: estate.selfDelivery,
      status: toAppEstateStatus(estate.status),
      ytdDeliveriesKg: Number(estate.ytdDeliveriesKg),
      bank: {
        bank: estate.bankName ?? '',
        branch: estate.bankBranch ?? '',
        account: estate.bankAccount ?? '',
      },
      paymentMethod: estate.paymentMethod ?? 'bank',
      documents: documents.map((d) => ({
        name: d.name,
        uploadedOn: d.uploadedOn,
      })),
      lastUpdatedBy: estate.lastUpdatedBy ?? undefined,
      lastUpdatedOn: estate.lastUpdatedOn
        ? estate.lastUpdatedOn.toISOString()
        : undefined,
    };
  }

  toPublicAdvance(entity: EstateAdvanceEntity): PublicAdvance {
    return {
      id: entity.id,
      estateId: formatEstateId(entity.estateId),
      estateName: entity.estateName,
      amount: Number(entity.amount),
      reason: entity.reason,
      dateIssued: entity.dateIssued,
      issuedBy: entity.issuedBy,
      status: toAppAdvanceStatus(entity.status),
    };
  }

  private toPublicSettlement(entity: SettlementEntity): PublicSettlement {
    return {
      id: entity.id,
      estateId: formatEstateId(entity.estateId),
      estateName: entity.estateName,
      period: entity.period,
      superKg: Number(entity.superKg),
      normalKg: Number(entity.normalKg),
      superRate: Number(entity.superRate),
      normalRate: Number(entity.normalRate),
      transportCost: Number(entity.transportCost),
      fertilizerDeduction: Number(entity.fertilizerDeduction),
      advanceDeduction: Number(entity.advanceDeduction),
      adjustment: Number(entity.adjustmentAmount ?? 0),
      status: toAppSettlementStatus(entity.status),
      selfDelivery: entity.selfDelivery,
      missingBank: entity.missingBank || undefined,
      processedBy: entity.processedBy ?? undefined,
      processedOn: entity.processedOn
        ? entity.processedOn.toISOString()
        : undefined,
    };
  }

  /** e.g. 'EADV-2026-4821' — business key in the fixture's style, not a DB serial. */
  private generateAdvanceId(): string {
    const year = new Date().getFullYear();
    const suffix =
      `${Date.now()}`.slice(-4) + String(Math.floor(Math.random() * 10));
    return `EADV-${year}-${suffix}`;
  }
}
