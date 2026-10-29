import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AppRole } from '../auth/role-map';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { parseEstateId } from '../estates/estate-map';
import { CreateBatchDto } from './dto/create-batch.dto';
import { RecordMovementDto } from './dto/record-movement.dto';
import { FertilizerAllocationEntity } from './fertilizer-allocation.entity';
import { FertilizerBatchEntity } from './fertilizer-batch.entity';
import { FertilizerChargeEntity } from './fertilizer-charge.entity';
import {
  formatBatchId,
  formatMovementId,
  formatRequestId,
  parseBatchId,
  type PublicBatch,
  type PublicItemPosition,
  type PublicMovement,
} from './fertilizer-map';
import { FertilizerRequestEntity } from './fertilizer-request.entity';
import {
  FertilizerPositionService,
  type StockSnapshot,
} from './fertilizer-position.service';
import { round2 } from './fertilizer-stock-ledger.service';
import { StockMovementEntity } from './stock-movement.entity';

export interface Actor {
  name: string;
  role: AppRole;
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
    @InjectRepository(FertilizerChargeEntity)
    private readonly chargeRepo: Repository<FertilizerChargeEntity>,
    @InjectRepository(FertilizerAllocationEntity)
    private readonly allocationRepo: Repository<FertilizerAllocationEntity>,
    private readonly access: DispatchAccessService,
    private readonly audit: AuditService,
    private readonly stock: FertilizerPositionService,
  ) {}

  // ── Batches ──────────────────────────────────────────────────────

  async listBatches(): Promise<PublicBatch[]> {
    const [batches, snap] = await Promise.all([
      this.batchRepo.find({ order: { item: 'ASC' } }),
      this.stock.snapshot(),
    ]);
    return batches.map((b) => this.toPublicBatch(b, snap));
  }

  async getBatch(id: string): Promise<PublicBatch> {
    const batch = await this.findBatch(id);
    return this.toPublicBatch(batch, await this.stock.snapshot());
  }

  /** FERT-01/03 — direct registration; also reached implicitly via an Incoming movement with no `batchId`. */
  async createBatch(dto: CreateBatchDto, actor: Actor): Promise<PublicBatch> {
    await this.assertCanWrite(actor);
    const batch = await this.saveNewBatch(dto, actor);
    await this.audit.record(actor, {
      action: 'Registered fertilizer batch',
      module: 'Fertilizer',
      record: formatBatchId(batch.id),
      recordHref: `/fertilizer/${formatBatchId(batch.id)}`,
      details: `${dto.item} — ${dto.quantityKg} kg`,
    });
    return this.toPublicBatch(batch, await this.stock.snapshot());
  }

  /** FERT-03 — marks a batch discarded; excluded from on-hand from that point on. */
  async discardBatch(id: string, actor: Actor): Promise<PublicBatch> {
    await this.assertCanWrite(actor);
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
    return this.toPublicBatch(saved, await this.stock.snapshot());
  }

  // ── Positions (FERT-01 — the single source of stock arithmetic) ────

  /** Stock figures and status come from the one stock-position service (FERT-01, cards, alerts, requests). */
  listPositions(now: Date = new Date()): Promise<PublicItemPosition[]> {
    return this.stock.listPositions(now);
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
   * (no `batchId`); Outgoing must target an existing batch and is ad-hoc
   * only — a request's fertilizer leaves through its delivery handover
   * (Fertilizer-Delivery-Addendum §5). Needs `fertilizer: edit`.
   */
  async recordMovement(
    dto: RecordMovementDto,
    actor: Actor,
  ): Promise<PublicMovement> {
    await this.assertCanWrite(actor);

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

    // Request-linked stock leaves only through the delivery flow (handover), which keeps the
    // FEFO commitment and the request in step. FERT-02 Outgoing is ad-hoc dispatch only.
    if (dto.linkedRequest) {
      throw new ConflictException(
        'Fertilizer for a request goes out through its delivery (Record handover on the request), not a stock movement.',
      );
    }
    // Ad-hoc stock may not dip into what's committed to approved requests.
    const committedHere = (
      await this.allocationRepo.find({
        where: { batchId: batch.id, state: 'active' },
      })
    ).reduce((sum, a) => sum + Number(a.qtyKg), 0);
    if (dto.quantityKg > Number(batch.quantityKg) - committedHere) {
      throw new ConflictException(
        `Only ${round2(Number(batch.quantityKg) - committedHere)} kg of this batch is free — the rest is committed to approved requests.`,
      );
    }

    batch.quantityKg = String(Number(batch.quantityKg) - dto.quantityKg);
    batch.lastUpdatedBy = actor.name;
    batch.lastUpdatedOn = new Date();
    await this.batchRepo.save(batch);

    // Structured estate link (Estate Owner Lifetime History slice) —
    // `destination` above stays a free-text label; this is what billing/the
    // lifetime timeline actually reads.
    const estateDbId = dto.estateId ? parseEstateId(dto.estateId) : null;

    const movement = this.movementRepo.create({
      batchId: batch.id,
      type: 'Outgoing',
      quantityKg: String(dto.quantityKg),
      movementDate: dto.date,
      destination: dto.destination,
      estateId: estateDbId,
      linkedRequestId: null,
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
        fertilizerRequestId: null,
        deliveryId: null,
        paymentMethod: null,
        ratePerKg: String(dto.ratePerKg),
        quantityKg: String(dto.quantityKg),
        totalCharge: String(dto.ratePerKg * dto.quantityKg),
        settlementId: null,
      });
      await this.chargeRepo.save(charge);
    }

    return this.toPublicMovement(savedMovement);
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

  /** Data-driven (`role_permissions`): writes need `fertilizer: edit`. */
  private async assertCanWrite(actor: Actor): Promise<void> {
    await this.access.require(
      actor.role,
      'edit',
      'change fertilizer stock',
      'fertilizer',
    );
  }

  private toPublicBatch(
    entity: FertilizerBatchEntity,
    snap: StockSnapshot,
  ): PublicBatch {
    return {
      ...this.stock.batchView(entity, snap),
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
