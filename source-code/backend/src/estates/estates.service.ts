import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { RegisterOwnedEstateDto } from './dto/register-owned-estate.dto';
import { TransportStatusService } from './transport-status.service';
import type { AppRole } from '../auth/role-map';
import { UsersService } from '../users/users.service';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { SettlementAdjustmentEntity } from '../collections/settlement-adjustment.entity';
import { keyToLabel } from '../reports/reports-map';
import {
  addMonths,
  monthsForInstallment,
  planError,
  planText,
} from '../advances/installments';
import { localDate } from '../dispatch/dispatch-map';
import { EstateAdvanceSettingsService } from './estate-advance-settings.service';
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
  settlementGross,
} from './estate-map';
import { EstateOwnerEntity } from './estate-owner.entity';
import { EstateEntity } from './estate.entity';
import { CreateEstateDto } from './dto/create-estate.dto';
import { IssueAdvanceDto } from './dto/issue-advance.dto';
import { UpdateEstateDto } from './dto/update-estate.dto';
import { RouteEntity } from './route.entity';
import { SettlementEntity } from './settlement.entity';
import {
  transportLines,
  type TransportSettlementFacts,
} from './settlement-transport';
import { type PublicTransportLine } from '../admin/transport-rules';

/** The transport line a generated settlement carries in its own columns. */
function generatedTransportLine(s: SettlementEntity): PublicTransportLine {
  return {
    status: s.transportStatus ?? 'not_configured',
    charge: Number(s.transportCharge ?? 0),
    carriedIn: Number(s.transportCarriedIn ?? 0),
    taken: Number(s.transportCost),
    carriedOut: Number(s.transportCarriedOut ?? 0),
    versionId: s.transportVersionId,
    versionMonth:
      (s.calculation as { transport?: { versionMonth?: string | null } })
        ?.transport?.versionMonth ?? null,
    frozen: s.status === 'processed',
  };
}

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
    private readonly transport: TransportStatusService,
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
    const ownerUser = await this.usersService.createUser(
      dto.contact,
      'estate_owner',
      dto.ownerName,
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
    const adjustmentOf = (s: SettlementEntity) =>
      s.status === 'pending'
        ? pending
            .filter((a) => a.estateId === s.estateId)
            .reduce((sum, a) => sum + Number(a.amountRs), 0)
        : Number(s.adjustmentAmount ?? 0);
    // Administration-Addendum §4: a pending settlement's transport is worked out live from the
    // version covering its month; a processed one shows what was frozen.
    const missingBank = new Set(
      settlements.filter((s) => s.missingBank).map((s) => s.id),
    );
    const generated = new Set(
      settlements.filter((s) => s.calculation != null).map((s) => s.id),
    );
    const lines = transportLines(
      settlements.map((s) => this.transportFacts(s, adjustmentOf(s))),
      await this.transport.versions(),
      await this.deliveryCounter(),
      (s) =>
        s.status === 'pending' &&
        !missingBank.has(s.id) &&
        !generated.has(s.id),
    );
    return settlements.map((s) => {
      const out = this.toPublicSettlement(s);
      // a generated settlement carries its own calculation (Settlement-Addendum)
      if (s.calculation != null) {
        out.transport = generatedTransportLine(s);
        return out;
      }
      if (s.status === 'legacy') return out;
      const line = lines.get(s.id) ?? null;
      out.transport = line;
      if (s.status === 'pending') {
        out.adjustment = adjustmentOf(s);
        if (line) out.transportCost = line.taken;
      }
      return out;
    });
  }

  /** The settlement facts the transport walk needs. */
  private transportFacts(
    s: SettlementEntity,
    adjustment: number,
  ): TransportSettlementFacts {
    return {
      id: s.id,
      estateId: s.estateId,
      period: s.period,
      status: s.status,
      selfDelivery: s.selfDelivery,
      gross: settlementGross(s),
      adjustment,
      others: Number(s.fertilizerDeduction) + Number(s.advanceDeduction),
      transportStatus: s.transportStatus ?? null,
      transportCharge: s.transportCharge ?? null,
      transportVersionId: s.transportVersionId ?? null,
      transportCarriedIn: s.transportCarriedIn ?? 0,
      transportCarriedOut: s.transportCarriedOut ?? 0,
      transportCost: s.transportCost,
    };
  }

  /** Confirmed deliveries per (estate, 'YYYY-MM') — the ones a settlement pays for. */
  private async deliveryCounter(
    deliveries?: CollectionRecordEntity[],
  ): Promise<(estateId: number, month: string) => number> {
    const rows =
      deliveries ??
      (await this.collectionRepo.find({ where: { status: 'confirmed' } }));
    const counts = new Map<string, number>();
    for (const d of rows) {
      if (d.estateId == null) continue;
      const k = `${d.estateId}|${String(d.collectionDate).slice(0, 7)}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return (estateId, month) => counts.get(`${estateId}|${month}`) ?? 0;
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

  async registerForOwner(userId: number, dto: RegisterOwnedEstateDto) {
    const owner = await this.ownerRepo.findOneBy({ userId });
    if (!owner) throw new NotFoundException('Estate owner profile not found.');
    const route = await this.assignRoute();
    const saved = await this.estateRepo.save(this.estateRepo.create({
      ownerId: owner.id,
      name: dto.name.trim(),
      address: dto.address.trim(),
      location: dto.address.trim(),
      areaAcres: String(dto.areaAcres),
      routeId: route.id,
      routeName: route.name,
      paymentMethod: 'cash',
      lastUpdatedBy: owner.name,
      lastUpdatedOn: new Date(),
    }));
    return { id: saved.id, name: saved.name, location: saved.location };
  }

  /**
   * System route assignment (EST-02: "auto-assigned by the system", never
   * manually picked). No geo data exists to route by location yet, so this
   * picks the least-loaded route - deterministic and keeps routes balanced.
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
      ...(entity.grossAmount != null
        ? { grossAmount: Number(entity.grossAmount) }
        : {}),
      generated: entity.calculation != null || undefined,
      legacyReason: entity.legacyReason ?? undefined,
      excludedReason: entity.excludedReason ?? undefined,
      payoutMethod: entity.payoutMethod ?? undefined,
      status: toAppSettlementStatus(entity.status),
      selfDelivery: entity.selfDelivery,
      missingBank: entity.missingBank || undefined,
      processedBy: entity.processedBy ?? undefined,
      processedOn: entity.processedOn
        ? entity.processedOn.toISOString()
        : undefined,
      transport: null,
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
