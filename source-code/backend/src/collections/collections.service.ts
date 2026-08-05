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
import { CollectionRecordEntity } from './collection-record.entity';
import { AgentDirectoryService } from '../dispatch/agent-directory.service';
import { DispatchNotifier } from '../dispatch/dispatch-notifier.service';
import { RouteResolverService } from '../dispatch/route-resolver.service';
import { EstateEntity } from '../estates/estate.entity';
import { formatEstateId } from '../estates/estate-map';
import {
  MISMATCH_THRESHOLD,
  toAppStatus,
  toDbGrade,
  weightSummary,
  type DbStatus,
  type PublicCollection,
} from './collection-map';
import { ComplaintEntity } from './complaint.entity';
import { DeliveryGradeLineEntity } from './delivery-grade-line.entity';
import { CreateExceptionDto } from './dto/create-exception.dto';
import { FlagCollectionDto } from './dto/flag-collection.dto';
import { SetGradeLinesDto } from './dto/set-grade-lines.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

export interface Actor {
  name: string;
  role: AppRole;
  /** users.id — needed to attribute a mismatch complaint to a person */
  sub?: number | null;
}

/** Statuses where the agent is still "whoever the route resolves to" — not yet stamped. */
const NOT_YET_COLLECTED = new Set<DbStatus>([
  'submitted',
  'approved',
  'agent_assigned',
  'pending_agent_confirmation',
]);

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(CollectionRecordEntity)
    private readonly repo: Repository<CollectionRecordEntity>,
    private readonly audit: AuditService,
    private readonly resolver: RouteResolverService,
    private readonly directory: AgentDirectoryService,
    private readonly notifier: DispatchNotifier,
    @InjectRepository(EstateEntity)
    private readonly estateRepo: Repository<EstateEntity>,
    @InjectRepository(ComplaintEntity)
    private readonly complaintRepo: Repository<ComplaintEntity>,
  ) {}

  async findAll(): Promise<PublicCollection[]> {
    const records = await this.repo.find({ order: { collectionDate: 'DESC' } });
    const agents = await this.resolvedAgents(records);
    return records.map((r) => this.toPublic(r, agents));
  }

  async findById(id: string): Promise<PublicCollection> {
    const record = await this.findEntity(id);
    return this.toPublic(record, await this.resolvedAgents([record]));
  }

  /**
   * For records not yet collected, the agent shown is whoever the ROUTE resolves to for
   * that date (cover wins) — resolved at read time, so a cover starting or ending moves
   * the request with no rewrite. Once collected, the stamped agent is the truth.
   */
  private async resolvedAgents(
    records: CollectionRecordEntity[],
  ): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const pairs = new Map<string, { routeId: number; date: string }>();
    for (const r of records) {
      if (
        r.routeId !== null &&
        NOT_YET_COLLECTED.has(r.status) &&
        r.agentName !== 'Self-delivered'
      ) {
        pairs.set(`${r.routeId}|${r.collectionDate}`, {
          routeId: r.routeId,
          date: r.collectionDate,
        });
      }
    }
    if (pairs.size === 0) return out;
    const names = await this.directory.names();
    for (const [key, { routeId, date }] of pairs) {
      const res = await this.resolver.getAgentForRoute(routeId, date);
      const name = res ? names.get(res.agentId) : undefined;
      if (name) out.set(key, name);
    }
    return out;
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

    record.weightKg = String(dto.weightKg);
    record.collectionDate = dto.date;
    record.lastUpdatedBy = actor.name;
    record.lastUpdatedOn = new Date();

    const saved = await this.repo.save(record);
    await this.audit.record(actor, {
      action: 'Edited collection record',
      module: 'Collection',
      record: saved.id,
      recordHref: `/collections/${saved.id}`,
    });
    return this.toPublic(saved);
  }

  /**
   * COL-02 — provisional exception entry, estate-first. Never sets an authoritative
   * weight (§7.1): the agent confirms actual weight on mobile. The caller picks only the
   * estate; the route comes from the estate and today's agent from the route resolver
   * (a cover agent when one is active), who is then notified.
   */
  async createException(
    dto: CreateExceptionDto,
    actor: Actor,
  ): Promise<PublicCollection> {
    this.assertCanWrite(actor);

    const estate = await this.estateRepo.findOne({
      where: { id: dto.estateId },
    });
    if (!estate) {
      throw new NotFoundException(`No estate ${dto.estateId}.`);
    }
    if (estate.status !== 'active') {
      throw new BadRequestException(
        `${estate.name} is inactive — exception entries are only for active estates.`,
      );
    }
    if (estate.routeId === null) {
      throw new BadRequestException(
        `${estate.name} has no route assigned yet.`,
      );
    }

    const resolved = estate.selfDelivery
      ? null
      : await this.resolver.getAgentForRoute(estate.routeId, dto.date);
    const agentName = estate.selfDelivery
      ? 'Self-delivered'
      : resolved
        ? ((await this.directory.names()).get(resolved.agentId) ?? 'Unassigned')
        : 'Unassigned';

    const now = new Date();
    const record = this.repo.create({
      id: this.generateId(estate.name, dto.date),
      estateId: estate.id,
      estateRef: formatEstateId(estate.id),
      estateName: estate.name,
      routeId: estate.routeId,
      routeName: estate.routeName ?? `Route ${estate.routeId}`,
      weightKg: String(dto.reportedWeight),
      status: 'pending_agent_confirmation',
      collectionDate: dto.date,
      // agent_id is stamped when the agent actually collects; until then the route decides
      agentId: null,
      agentName,
      photos: [],
      gradeLines: [],
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

    const saved = await this.repo.save(record);
    await this.audit.record(actor, {
      action: 'Logged provisional collection entry',
      module: 'Collection',
      record: saved.id,
      recordHref: `/collections/${saved.id}`,
      details: `${estate.name} — ${dto.reason}${resolved?.covering ? ' (routed to cover agent)' : ''}`,
    });

    if (resolved) {
      await this.notifier.notifyAgent(resolved.agentId, {
        type: 'exception_request',
        title: `Confirm a pickup: ${estate.name}`,
        body: `${actor.name} logged ~${dto.reportedWeight} kg for ${estate.name} on ${dto.date}. Please confirm the actual weight.`,
        referenceType: 'tea_collection_records',
      });
    }
    return this.toPublic(
      saved,
      new Map([[`${saved.routeId}|${saved.collectionDate}`, agentName]]),
    );
  }

  /**
   * Factory-side grading at receiving — the ONLY way grade lines are written. Agents and
   * owners can't reach this (portal tokens only) and the mobile app has no grade input.
   * Replaces the delivery's lines (one per grade, a duplicate is a 409), confirms the
   * record, and raises a weight-mismatch complaint when the graded total strays from the
   * estate weight beyond the threshold.
   */
  async setGradeLines(
    id: string,
    dto: SetGradeLinesDto,
    actor: Actor,
  ): Promise<PublicCollection> {
    this.assertCanWrite(actor);
    const record = await this.findEntity(id);

    if (record.status === 'confirmed') {
      throw new ConflictException(
        'This record is confirmed and locked. Use Flag for Correction instead of regrading it.',
      );
    }
    if (record.status !== 'collected') {
      throw new BadRequestException(
        'Grading happens at the factory once the agent has collected — this record is not Collected yet.',
      );
    }

    const grades = dto.lines.map((l) => toDbGrade(l.grade));
    if (new Set(grades).size !== grades.length) {
      throw new ConflictException(
        'A delivery can have only one grade line per grade.',
      );
    }

    const now = new Date();
    const existing = new Map(
      (record.gradeLines ?? []).map((l) => [l.grade, l]),
    );
    // Reuse a line's row when its grade is unchanged (updates in place — avoids tripping
    // UNIQUE(delivery_id, grade) on replace); lines missing from the payload are orphan-deleted.
    record.gradeLines = dto.lines.map((l) => {
      const grade = toDbGrade(l.grade);
      const line = existing.get(grade) ?? new DeliveryGradeLineEntity();
      line.grade = grade;
      line.weightKg = String(l.weightKg);
      line.gradedBy = actor.name;
      line.gradedAt = now;
      return line;
    });

    const total = dto.lines.reduce((s, l) => s + l.weightKg, 0);
    const estateKg = Number(record.weightKg);
    const diff = estateKg > 0 ? Math.abs(total - estateKg) / estateKg : 0;

    record.status = 'confirmed';
    record.timeline = [
      ...record.timeline,
      {
        status: 'Confirmed',
        timestamp: now.toISOString(),
        by: `${actor.name} — graded ${dto.lines
          .map((l) => `${l.grade} ${l.weightKg} kg`)
          .join(', ')}`,
      },
    ];
    record.lastUpdatedBy = actor.name;
    record.lastUpdatedOn = now;

    if (diff > MISMATCH_THRESHOLD) {
      const note = `Estate weight ${estateKg} kg vs factory graded total ${total} kg (${(diff * 100).toFixed(1)}% apart).`;
      let complaintId = 'unfiled';
      if (actor.sub) {
        const complaint = await this.complaintRepo.save(
          this.complaintRepo.create({
            type: 'weight_mismatch',
            raisedByUserId: actor.sub,
            collectionRecordId: record.id,
            description: note,
            status: 'open',
          }),
        );
        complaintId = `C-${complaint.id}`;
      }
      record.mismatch = { complaintId, note };
    }

    const saved = await this.repo.save(record);
    await this.audit.record(actor, {
      action: 'Graded collection record',
      module: 'Collection',
      record: saved.id,
      recordHref: `/collections/${saved.id}`,
      details: dto.lines.map((l) => `${l.grade} ${l.weightKg} kg`).join(', '),
    });
    return this.toPublic(saved);
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

    // The correction request is captured both as a timeline entry (rendered on
    // CollectionDetailPage) and, since the Administration slice (2.6), as a
    // real audit_logs row via AuditService below.
    // Note: CollectionDetailPage's timeline view matches the first entry for a
    // given status, so this second 'Confirmed' entry isn't rendered as its own
    // row there today; the data is still captured.
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

    const saved = await this.repo.save(record);
    await this.audit.record(actor, {
      action: 'Flagged collection record for correction',
      module: 'Collection',
      record: saved.id,
      recordHref: `/collections/${saved.id}`,
      details: dto.reason,
    });
    return this.toPublic(saved);
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

  private toPublic(
    entity: CollectionRecordEntity,
    resolvedAgents: Map<string, string> = new Map(),
  ): PublicCollection {
    const resolved =
      entity.routeId !== null && NOT_YET_COLLECTED.has(entity.status)
        ? resolvedAgents.get(`${entity.routeId}|${entity.collectionDate}`)
        : undefined;
    return {
      id: entity.id,
      estateId:
        entity.estateRef ??
        (entity.estateId !== null ? String(entity.estateId) : ''),
      estateName: entity.estateName,
      route: entity.routeName,
      ...weightSummary(entity),
      status: toAppStatus(entity.status),
      date: entity.collectionDate,
      agent: resolved ?? entity.agentName,
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
