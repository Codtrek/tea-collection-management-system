import {
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

export interface Actor {
  name: string;
  role: AppRole;
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
    private readonly usersService: UsersService,
    private readonly audit: AuditService,
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
      bankName: dto.bank,
      bankBranch: dto.branch,
      bankAccount: dto.account,
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
    estate.bankName = dto.bank;
    estate.bankBranch = dto.branch;
    estate.bankAccount = dto.account;
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

  async listAdvances(): Promise<PublicAdvance[]> {
    const advances = await this.advanceRepo.find({
      order: { dateIssued: 'DESC' },
    });
    return advances.map((a) => this.toPublicAdvance(a));
  }

  /** EST-06 — money moves immediately; deducted at the estate's next processed settlement. */
  async issueAdvance(
    dto: IssueAdvanceDto,
    actor: Actor,
  ): Promise<PublicAdvance> {
    this.assertCanWrite(actor);
    const estate = await this.findEntity(dto.estateId);

    const advance = this.advanceRepo.create({
      id: this.generateAdvanceId(),
      estateId: estate.id,
      estateName: estate.name,
      amount: String(dto.amount),
      reason: dto.reason,
      dateIssued: new Date().toISOString().slice(0, 10),
      issuedBy: actor.name,
      status: 'pending_deduction',
    });

    const saved = await this.advanceRepo.save(advance);
    await this.audit.record(actor, {
      action: `Issued advance Rs. ${dto.amount}`,
      module: 'Estate Owner',
      record: saved.id,
      recordHref: `/estates/${formatEstateId(estate.id)}`,
      details: `${estate.name} — ${dto.reason}`,
    });
    return this.toPublicAdvance(saved);
  }

  async listSettlements(): Promise<PublicSettlement[]> {
    const settlements = await this.settlementRepo.find({
      order: { period: 'DESC' },
    });
    return settlements.map((s) => this.toPublicSettlement(s));
  }

  /**
   * EST-08 — processes every currently-Pending settlement in one run
   * (matches the portal's single "Process N Settlements" action; there's no
   * per-settlement targeting). Missing-bank estates are excluded, not
   * blocked (UC-054) — flip their bank details and they're picked up next
   * run. Included estates' pending advances flip to Deducted. No
   * per-transaction bank charge is applied (resolved 2026-07-26 — see
   * Claude.md's Payment calculation section).
   */
  async processSettlements(actor: Actor): Promise<PublicSettlement[]> {
    this.assertCanWrite(actor);

    const all = await this.settlementRepo.find();
    const eligible = all.filter(
      (s) => s.status === 'pending' && !s.missingBank,
    );

    if (eligible.length === 0) {
      throw new ConflictException(
        'No pending settlements are ready to process.',
      );
    }

    const now = new Date();
    const processed: SettlementEntity[] = [];
    const allAdvances = await this.advanceRepo.find();

    for (const settlement of eligible) {
      settlement.status = 'processed';
      settlement.processedBy = actor.name;
      settlement.processedOn = now;
      processed.push(await this.settlementRepo.save(settlement));

      for (const advance of allAdvances) {
        if (
          advance.estateId === settlement.estateId &&
          advance.status === 'pending_deduction'
        ) {
          advance.status = 'deducted';
          await this.advanceRepo.save(advance);
        }
      }
    }

    await this.audit.record(actor, {
      action: 'Processed settlement run',
      module: 'Estate Owner',
      record: `${processed.length} settlement(s)`,
      recordHref: '/estates/settlements',
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
  private assertCanWrite(actor: Actor): void {
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

  private toPublicAdvance(entity: EstateAdvanceEntity): PublicAdvance {
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
