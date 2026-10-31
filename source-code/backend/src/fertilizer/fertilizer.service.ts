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
import { EstateEntity } from '../estates/estate.entity';
import { parseEstateId } from '../estates/estate-map';
import { CreateBatchDto } from './dto/create-batch.dto';
import { DecideRequestDto } from './dto/decide-request.dto';
import { LogRequestDto } from './dto/log-request.dto';
import { RecordMovementDto } from './dto/record-movement.dto';
import { FertilizerBatchEntity } from './fertilizer-batch.entity';
import { FertilizerChargeEntity } from './fertilizer-charge.entity';
import {
  formatBatchId,
  formatMovementId,
  formatRequestId,
  parseBatchId,
  parseRequestId,
  type CoverageStatus,
  type PublicBatch,
  type PublicItemPosition,
  type PublicMovement,
  type PublicRequest,
} from './fertilizer-map';
import { FertilizerRequestEntity } from './fertilizer-request.entity';
import { StockMovementEntity } from './stock-movement.entity';

export interface Actor {
  name: string;
  role: AppRole;
}

/** Requests contributing to committed stock (approval commits it; §4). */
function isCommitting(r: FertilizerRequestEntity): boolean {
  return r.status === 'Approved' || r.status === 'Partially Dispatched';
}

/** Undispatched remainder of an approved request. */
function remainderOf(r: FertilizerRequestEntity): number {
  const approved =
    r.approvedQtyKg !== null ? Number(r.approvedQtyKg) : Number(r.quantityKg);
  return approved - Number(r.dispatchedQtyKg);
}

/** Days from today until the batch expires (negative when already past). */
function daysToExpiry(batch: FertilizerBatchEntity): number {
  return Math.ceil(
    (new Date(batch.expiryDate).getTime() - Date.now()) / 86_400_000,
  );
}

/** Non-expired, non-discarded — the only batches that count toward on-hand or FEFO. */
function isLiveBatch(batch: FertilizerBatchEntity): boolean {
  return !batch.discarded && daysToExpiry(batch) >= 0;
}

@Injectable()
export class FertilizerService {
  constructor(
    @InjectRepository(FertilizerBatchEntity)
    private readonly batchRepo: Repository<FertilizerBatchEntity>,
    @InjectRepository(StockMovementEntity)
    private readonly movementRepo: Repository<StockMovementEntity>,
    @InjectRepository(FertilizerRequestEntity)
    private readonly requestRepo: Repository<FertilizerRequestEntity>,
    @InjectRepository(EstateEntity)
    private readonly estateRepo: Repository<EstateEntity>,
    @InjectRepository(FertilizerChargeEntity)
    private readonly chargeRepo: Repository<FertilizerChargeEntity>,
    private readonly audit: AuditService,
  ) {}

  // ── Batches ──────────────────────────────────────────────────────

  async listBatches(): Promise<PublicBatch[]> {
    const batches = await this.batchRepo.find({ order: { item: 'ASC' } });
    return batches.map((b) => this.toPublicBatch(b));
  }

  async getBatch(id: string): Promise<PublicBatch> {
    return this.toPublicBatch(await this.findBatch(id));
  }

  /** FERT-01/03 — direct registration; also reached implicitly via an Incoming movement with no `batchId`. */
  async createBatch(dto: CreateBatchDto, actor: Actor): Promise<PublicBatch> {
    this.assertCanWrite(actor);
    const batch = await this.saveNewBatch(dto, actor);
    await this.audit.record(actor, {
      action: 'Registered fertilizer batch',
      module: 'Fertilizer',
      record: formatBatchId(batch.id),
      recordHref: `/fertilizer/${formatBatchId(batch.id)}`,
      details: `${dto.item} — ${dto.quantityKg} kg`,
    });
    return this.toPublicBatch(batch);
  }

  /** FERT-03 — marks a batch discarded; excluded from on-hand from that point on. */
  async discardBatch(id: string, actor: Actor): Promise<PublicBatch> {
    this.assertCanWrite(actor);
    const batch = await this.findBatch(id);
    batch.discarded = true;
    batch.lastUpdatedBy = actor.name;
    batch.lastUpdatedOn = new Date();
    const saved = await this.batchRepo.save(batch);
    await this.audit.record(actor, {
      action: 'Discarded fertilizer batch',
      module: 'Fertilizer',
      record: formatBatchId(saved.id),
      recordHref: `/fertilizer/${formatBatchId(saved.id)}`,
    });
    return this.toPublicBatch(saved);
  }

  // ── Positions (FERT-01 — the single source of stock arithmetic) ────

  async listPositions(): Promise<PublicItemPosition[]> {
    const batches = await this.batchRepo.find();
    const requests = await this.requestRepo.find();
    const items = [...new Set(batches.map((b) => b.item))];

    return items.map((item) => {
      const category = batches.find((b) => b.item === item)!.category;
      const onHand = this.onHandForItem(item, batches);
      const committed = this.committedForItem(item, requests);
      const available = onHand - committed;
      const pendingDemand = requests
        .filter((r) => r.item === item && r.status === 'Submitted')
        .reduce((sum, r) => sum + Number(r.quantityKg), 0);

      return {
        item,
        category,
        onHand,
        committed,
        available,
        pendingDemand,
        coverageRatio: pendingDemand > 0 ? available / pendingDemand : null,
        status: this.coverageStatus(available, pendingDemand),
      };
    });
  }

  // ── Requests ─────────────────────────────────────────────────────

  async listRequests(): Promise<PublicRequest[]> {
    const requests = await this.requestRepo.find({
      order: { createdAt: 'DESC' },
    });
    const estates = await this.estateRepo.find();
    return requests.map((r) =>
      this.toPublicRequest(
        r,
        estates.find((e) => e.id === r.estateId)?.name ?? 'Unknown estate',
      ),
    );
  }

  async getRequest(id: string): Promise<PublicRequest> {
    const request = await this.findRequest(id);
    const estate = await this.estateRepo.findOne({
      where: { id: request.estateId },
    });
    return this.toPublicRequest(request, estate?.name ?? 'Unknown estate');
  }

  /** FERT-07 — log a phoned-in request on an estate's behalf. Officer+ (portal: `fertilizer: 'edit'`). */
  async logRequest(dto: LogRequestDto, actor: Actor): Promise<PublicRequest> {
    this.assertCanWrite(actor);
    const estate = await this.estateRepo.findOne({
      where: { id: parseEstateId(dto.estateId) },
    });
    if (!estate) {
      throw new NotFoundException(`No estate "${dto.estateId}".`);
    }

    const request = this.requestRepo.create({
      requestedBy: null,
      estateId: estate.id,
      ownerId: estate.ownerId,
      item: dto.item,
      quantityKg: String(dto.quantityKg),
      justification: dto.reason ?? null,
      factoryId: null,
      origin: 'web',
      status: 'Submitted',
      approvedQtyKg: null,
      dispatchedQtyKg: '0',
      decidedBy: null,
      decidedOn: null,
    });

    const saved = await this.requestRepo.save(request);
    await this.audit.record(actor, {
      action: 'Logged fertilizer request',
      module: 'Fertilizer',
      record: formatRequestId(saved.id, saved.createdAt),
      details: `${estate.name} — ${dto.item} ${dto.quantityKg} kg`,
    });
    return this.toPublicRequest(saved, estate.name);
  }

  /**
   * FERT-06 — Administrator only (portal: `fertilizer: 'approve'`; Officer's
   * `edit` covers logging/dispatch but not the decision). Only a Submitted
   * request can be decided, matching the portal's gating (`isPending`).
   */
  async decideRequest(
    id: string,
    dto: DecideRequestDto,
    actor: Actor,
  ): Promise<PublicRequest> {
    this.assertIsAdmin(actor);
    const request = await this.findRequest(id);
    if (request.status !== 'Submitted') {
      throw new ConflictException(`Request "${id}" has already been decided.`);
    }

    if (dto.decision === 'approve') {
      const approvedQty = dto.approvedQtyKg ?? Number(request.quantityKg);
      if (approvedQty <= 0 || approvedQty > Number(request.quantityKg)) {
        throw new ConflictException(
          'Approved quantity must be positive and cannot exceed the requested quantity.',
        );
      }
      request.approvedQtyKg = String(approvedQty);
      request.status = 'Approved';
    } else if (dto.decision === 'reject') {
      request.status = 'Rejected';
    } else {
      request.status = 'Cancelled';
    }
    request.decidedBy = actor.name;
    request.decidedOn = new Date();

    const saved = await this.requestRepo.save(request);
    const estate = await this.estateRepo.findOne({
      where: { id: saved.estateId },
    });
    await this.audit.record(actor, {
      action: `${request.status} fertilizer request`,
      module: 'Fertilizer',
      record: formatRequestId(saved.id, saved.createdAt),
      details: estate?.name ?? 'Unknown estate',
    });
    return this.toPublicRequest(saved, estate?.name ?? 'Unknown estate');
  }

  // ── Movements ────────────────────────────────────────────────────

  async listMovements(): Promise<PublicMovement[]> {
    const movements = await this.movementRepo.find({
      order: { createdAt: 'DESC' },
    });
    const requests = await this.requestRepo.find();
    return movements.map((m) =>
      this.toPublicMovement(
        m,
        m.linkedRequestId
          ? requests.find((r) => r.id === m.linkedRequestId)
          : undefined,
      ),
    );
  }

  /**
   * FERT-02/03 — Incoming restocks an existing batch or creates a new one
   * (no `batchId`); Outgoing must target an existing batch and may
   * optionally fulfil an approved request (`linkedRequest`) — ad-hoc
   * dispatch (no request) is allowed alongside it (resolved 2026-07-27).
   * Officer+ (portal: `fertilizer: 'edit'`).
   */
  async recordMovement(
    dto: RecordMovementDto,
    actor: Actor,
  ): Promise<PublicMovement> {
    this.assertCanWrite(actor);

    const movement =
      dto.type === 'Incoming'
        ? await this.recordIncoming(dto, actor)
        : await this.recordOutgoing(dto, actor);
    await this.audit.record(actor, {
      action: `Logged ${dto.type.toLowerCase()} stock movement`,
      module: 'Fertilizer',
      record: movement.id,
      recordHref: '/fertilizer',
      details: dto.item
        ? `${dto.item} — ${dto.quantityKg} kg`
        : `${dto.quantityKg} kg`,
    });
    return movement;
  }

  private async recordIncoming(
    dto: RecordMovementDto,
    actor: Actor,
  ): Promise<PublicMovement> {
    let batch: FertilizerBatchEntity;

    if (dto.batchId) {
      batch = await this.findBatch(dto.batchId);
      if (batch.discarded) {
        throw new ConflictException(
          `Batch "${dto.batchId}" is discarded and cannot be restocked.`,
        );
      }
      batch.quantityKg = String(Number(batch.quantityKg) + dto.quantityKg);
      batch.lastUpdatedBy = actor.name;
      batch.lastUpdatedOn = new Date();
      batch = await this.batchRepo.save(batch);
    } else {
      if (!dto.item || !dto.expiryDate) {
        throw new ConflictException(
          'A new batch needs at least an item and an expiry date.',
        );
      }
      batch = await this.saveNewBatch(
        {
          item: dto.item,
          category: dto.category ?? 'Fertilizer',
          quantityKg: dto.quantityKg,
          unit: dto.unit ?? 'kg',
          receivedDate: dto.date,
          expiryDate: dto.expiryDate,
          supplier: dto.supplier,
          lotNumber: dto.lotNumber,
        },
        actor,
      );
    }

    const movement = this.movementRepo.create({
      batchId: batch.id,
      type: 'Incoming',
      quantityKg: String(dto.quantityKg),
      movementDate: dto.date,
      destination: null,
      linkedRequestId: null,
      supplier: dto.supplier ?? null,
      notes: dto.notes ?? null,
      recordedBy: actor.name,
    });
    return this.toPublicMovement(await this.movementRepo.save(movement));
  }

  private async recordOutgoing(
    dto: RecordMovementDto,
    actor: Actor,
  ): Promise<PublicMovement> {
    if (!dto.batchId) {
      throw new ConflictException(
        'Outgoing movements must come from an existing batch.',
      );
    }
    if (!dto.destination) {
      throw new ConflictException(
        'Destination is required for an Outgoing movement.',
      );
    }

    const batch = await this.findBatch(dto.batchId);
    if (dto.quantityKg > Number(batch.quantityKg)) {
      throw new ConflictException(
        `Cannot exceed available stock (${batch.quantityKg} kg).`,
      );
    }

    let request: FertilizerRequestEntity | null = null;
    if (dto.linkedRequest) {
      request = await this.findRequest(dto.linkedRequest);
      if (!isCommitting(request)) {
        throw new ConflictException(
          `Request "${dto.linkedRequest}" has no approved remainder to dispatch against.`,
        );
      }
      const remainder = remainderOf(request);
      if (dto.quantityKg > remainder) {
        throw new ConflictException(
          `Cannot exceed the approved remainder (${remainder} kg).`,
        );
      }
      request.dispatchedQtyKg = String(
        Number(request.dispatchedQtyKg) + dto.quantityKg,
      );
      // remainderOf reads the just-updated dispatchedQtyKg, so this is the
      // remainder *after* this dispatch — no separate subtraction needed.
      request.status =
        remainderOf(request) <= 0 ? 'Dispatched' : 'Partially Dispatched';
      await this.requestRepo.save(request);
    }

    batch.quantityKg = String(Number(batch.quantityKg) - dto.quantityKg);
    batch.lastUpdatedBy = actor.name;
    batch.lastUpdatedOn = new Date();
    await this.batchRepo.save(batch);

    // Structured estate link (Estate Owner Lifetime History slice) —
    // `destination` above stays a free-text label; this is what billing/the
    // lifetime timeline actually reads. A linked request's estate wins over
    // an explicitly-passed ad-hoc `estateId` (the request is authoritative).
    const estateDbId = request
      ? request.estateId
      : dto.estateId
        ? parseEstateId(dto.estateId)
        : null;

    const movement = this.movementRepo.create({
      batchId: batch.id,
      type: 'Outgoing',
      quantityKg: String(dto.quantityKg),
      movementDate: dto.date,
      destination: dto.destination,
      estateId: estateDbId,
      linkedRequestId: request?.id ?? null,
      supplier: null,
      notes: dto.notes ?? null,
      recordedBy: actor.name,
    });
    const savedMovement = await this.movementRepo.save(movement);

    // A rate is optional — not every dispatch is billed (e.g. free
    // replacement stock). No rate → no charge row, no crash.
    if (dto.ratePerKg) {
      const charge = this.chargeRepo.create({
        stockMovementId: savedMovement.id,
        estateId: estateDbId,
        fertilizerRequestId: request?.id ?? null,
        ratePerKg: String(dto.ratePerKg),
        quantityKg: String(dto.quantityKg),
        totalCharge: String(dto.ratePerKg * dto.quantityKg),
        settlementId: null,
      });
      await this.chargeRepo.save(charge);
    }

    return this.toPublicMovement(savedMovement, request ?? undefined);
  }

  // ── Shared helpers ───────────────────────────────────────────────

  private async saveNewBatch(
    dto: CreateBatchDto,
    actor: Actor,
  ): Promise<FertilizerBatchEntity> {
    const batch = this.batchRepo.create({
      item: dto.item,
      category: dto.category,
      quantityKg: String(dto.quantityKg),
      unit: dto.unit,
      receivedDate: dto.receivedDate,
      expiryDate: dto.expiryDate,
      location: dto.location ?? null,
      supplier: dto.supplier ?? null,
      lotNumber: dto.lotNumber ?? null,
      qualityNotes: dto.qualityNotes ?? null,
      discarded: false,
      lastUpdatedBy: actor.name,
      lastUpdatedOn: new Date(),
    });
    return this.batchRepo.save(batch);
  }

  private async findBatch(formattedId: string): Promise<FertilizerBatchEntity> {
    const id = parseBatchId(formattedId);
    const batch = Number.isNaN(id)
      ? null
      : await this.batchRepo.findOne({ where: { id } });
    if (!batch) {
      throw new NotFoundException(`No fertilizer batch "${formattedId}".`);
    }
    return batch;
  }

  private async findRequest(
    formattedId: string,
  ): Promise<FertilizerRequestEntity> {
    const id = parseRequestId(formattedId);
    const request = Number.isNaN(id)
      ? null
      : await this.requestRepo.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException(`No fertilizer request "${formattedId}".`);
    }
    return request;
  }

  private onHandForItem(
    item: string,
    batches: FertilizerBatchEntity[],
  ): number {
    return batches
      .filter((b) => b.item === item && isLiveBatch(b))
      .reduce((sum, b) => sum + Number(b.quantityKg), 0);
  }

  private committedForItem(
    item: string,
    requests: FertilizerRequestEntity[],
  ): number {
    return requests
      .filter((r) => r.item === item && isCommitting(r))
      .reduce((sum, r) => sum + remainderOf(r), 0);
  }

  private coverageStatus(available: number, pending: number): CoverageStatus {
    if (pending <= 0) return available < 0 ? 'Short' : 'Healthy';
    if (available >= pending) return 'Healthy';
    if (available >= pending * 0.5) return 'Tight';
    return 'Short';
  }

  /** Officer+ (Manager is view-only — portal: `fertilizer: 'edit'` threshold). */
  private assertCanWrite(actor: Actor): void {
    if (actor.role === 'Manager') {
      throw new ForbiddenException(
        'Managers have read-only access to this resource.',
      );
    }
  }

  /** Administrator only (portal: `fertilizer: 'approve'`). */
  private assertIsAdmin(actor: Actor): void {
    if (actor.role !== 'Administrator') {
      throw new ForbiddenException(
        'Only an Administrator can decide a fertilizer request.',
      );
    }
  }

  private toPublicBatch(entity: FertilizerBatchEntity): PublicBatch {
    return {
      id: formatBatchId(entity.id),
      item: entity.item,
      category: entity.category,
      quantityKg: Number(entity.quantityKg),
      unit: entity.unit,
      receivedDate: entity.receivedDate,
      expiryDate: entity.expiryDate,
      location: entity.location ?? '',
      supplier: entity.supplier ?? '',
      lotNumber: entity.lotNumber ?? '',
      qualityNotes: entity.qualityNotes ?? undefined,
      discarded: entity.discarded || undefined,
      lastUpdatedBy: entity.lastUpdatedBy ?? undefined,
      lastUpdatedOn: entity.lastUpdatedOn
        ? entity.lastUpdatedOn.toISOString()
        : undefined,
    };
  }

  private toPublicRequest(
    entity: FertilizerRequestEntity,
    estateName: string,
  ): PublicRequest {
    return {
      id: formatRequestId(entity.id, entity.createdAt),
      estateName,
      item: entity.item,
      quantityKg: Number(entity.quantityKg),
      requestedDate: entity.createdAt.toISOString().slice(0, 10),
      origin: entity.origin,
      status: entity.status,
      reason: entity.justification ?? undefined,
      approvedQtyKg:
        entity.approvedQtyKg !== null
          ? Number(entity.approvedQtyKg)
          : undefined,
      dispatchedQtyKg: Number(entity.dispatchedQtyKg) || undefined,
      decidedBy: entity.decidedBy ?? undefined,
      decidedOn: entity.decidedOn ? entity.decidedOn.toISOString() : undefined,
    };
  }

  private toPublicMovement(
    entity: StockMovementEntity,
    linkedRequest?: FertilizerRequestEntity,
  ): PublicMovement {
    return {
      id: formatMovementId(entity.id),
      batchId: formatBatchId(entity.batchId),
      type: entity.type,
      quantityKg: Number(entity.quantityKg),
      date: entity.movementDate,
      destination: entity.destination ?? undefined,
      linkedRequest: linkedRequest
        ? formatRequestId(linkedRequest.id, linkedRequest.createdAt)
        : undefined,
      supplier: entity.supplier ?? undefined,
      notes: entity.notes ?? undefined,
      recordedBy: entity.recordedBy ?? 'Unknown',
    };
  }
}
