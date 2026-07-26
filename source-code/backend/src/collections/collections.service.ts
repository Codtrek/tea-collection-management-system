import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AppRole } from '../auth/role-map';
import { CollectionRecordEntity } from './collection-record.entity';
import {
  toAppGrade,
  toAppStatus,
  toDbGrade,
  type PublicCollection,
} from './collection-map';
import { CreateExceptionDto } from './dto/create-exception.dto';
import { FlagCollectionDto } from './dto/flag-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

export interface Actor {
  name: string;
  role: AppRole;
}

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(CollectionRecordEntity)
    private readonly repo: Repository<CollectionRecordEntity>,
  ) {}

  async findAll(): Promise<PublicCollection[]> {
    const records = await this.repo.find({ order: { collectionDate: 'DESC' } });
    return records.map((r) => this.toPublic(r));
  }

  async findById(id: string): Promise<PublicCollection> {
    return this.toPublic(await this.findEntity(id));
  }

  /** COL-04. Confirmed records are locked (§7.1) — must Flag for Correction instead. */
  async update(
    id: string,
    dto: UpdateCollectionDto,
    actor: Actor,
  ): Promise<PublicCollection> {
    this.assertCanWrite(actor);
    const record = await this.findEntity(id);

    if (record.status === 'confirmed') {
      throw new ConflictException(
        'This record is confirmed and locked. Use Flag for Correction instead of editing it directly.',
      );
    }

    if (dto.grade !== undefined) {
      const requestedGrade = toDbGrade(dto.grade);
      // Grading belongs to the Tea Receiving Officer once status is Collected; only
      // reject when the caller is actually trying to *change* the grade early —
      // the edit form always includes the current grade in its payload.
      if (requestedGrade !== record.grade && record.status !== 'collected') {
        throw new BadRequestException(
          'Grade can only be set once the record status is Collected.',
        );
      }
      record.grade = requestedGrade;
    }

    record.weightKg = String(dto.weightKg);
    record.collectionDate = dto.date;
    record.lastUpdatedBy = actor.name;
    record.lastUpdatedOn = new Date();

    return this.toPublic(await this.repo.save(record));
  }

  /**
   * COL-02 — provisional exception entry. Never sets an authoritative weight
   * (§7.1): the assigned agent confirms actual weight on mobile.
   */
  async createException(
    dto: CreateExceptionDto,
    actor: Actor,
  ): Promise<PublicCollection> {
    this.assertCanWrite(actor);

    const now = new Date();
    const record = this.repo.create({
      id: this.generateId(dto.estateName, dto.date),
      estateId: null,
      estateRef: dto.estateId,
      estateName: dto.estateName,
      routeId: null,
      routeName: dto.route,
      weightKg: String(dto.reportedWeight),
      grade: 'pending',
      status: 'pending_agent_confirmation',
      collectionDate: dto.date,
      agentId: null,
      agentName: dto.agent ?? 'Unassigned',
      photos: [],
      timeline: [
        {
          status: 'Pending Agent Confirmation',
          timestamp: now.toISOString(),
          by: actor.name,
        },
      ],
      provisional: { reportedBy: actor.name, reason: dto.reason },
      mismatch: null,
      lastUpdatedBy: actor.name,
      lastUpdatedOn: now,
    });

    return this.toPublic(await this.repo.save(record));
  }

  /** Audit-tracked correction request against a locked (Confirmed) record. */
  async flag(
    id: string,
    dto: FlagCollectionDto,
    actor: Actor,
  ): Promise<PublicCollection> {
    this.assertCanWrite(actor);
    const record = await this.findEntity(id);

    if (record.status !== 'confirmed') {
      throw new BadRequestException(
        'Only confirmed records need Flag for Correction — this record can still be edited directly.',
      );
    }

    // No global audit_logs table yet (that lands with Administration, PLAN.md
    // Phase 2.6) — record the correction request as a timeline entry for now.
    // Note: CollectionDetailPage's timeline view matches the first entry for a
    // given status, so this second 'Confirmed' entry isn't rendered as its own
    // row there today; the data is still captured for when audit_logs lands.
    record.timeline = [
      ...record.timeline,
      {
        status: toAppStatus(record.status),
        timestamp: new Date().toISOString(),
        by: `${actor.name} — correction requested: ${dto.reason}`,
      },
    ];
    record.lastUpdatedBy = actor.name;
    record.lastUpdatedOn = new Date();

    return this.toPublic(await this.repo.save(record));
  }

  private async findEntity(id: string): Promise<CollectionRecordEntity> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`No collection record "${id}".`);
    }
    return record;
  }

  /** Manager has read-only access to Collections (Administrator/Officer can write). */
  private assertCanWrite(actor: Actor): void {
    if (actor.role === 'Manager') {
      throw new ForbiddenException(
        'Managers have read-only access to collections.',
      );
    }
  }

  private toPublic(entity: CollectionRecordEntity): PublicCollection {
    return {
      id: entity.id,
      estateId:
        entity.estateRef ??
        (entity.estateId !== null ? String(entity.estateId) : ''),
      estateName: entity.estateName,
      route: entity.routeName,
      weightKg: Number(entity.weightKg),
      grade: toAppGrade(entity.grade),
      status: toAppStatus(entity.status),
      date: entity.collectionDate,
      agent: entity.agentName,
      photos: entity.photos ?? [],
      timeline: entity.timeline ?? [],
      mismatch: entity.mismatch ?? undefined,
      provisional: entity.provisional ?? undefined,
      lastUpdatedBy: entity.lastUpdatedBy ?? undefined,
      lastUpdatedOn: entity.lastUpdatedOn
        ? entity.lastUpdatedOn.toISOString()
        : undefined,
    };
  }

  /** e.g. 'GV-2026-4821' — business key in the fixture's style, not a DB serial. */
  private generateId(estateName: string, date: string): string {
    const initials =
      estateName
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) || 'EXC';
    const year = date.slice(0, 4) || String(new Date().getFullYear());
    const suffix =
      `${Date.now()}`.slice(-4) + String(Math.floor(Math.random() * 10));
    return `${initials}-${year}-${suffix}`;
  }
}
