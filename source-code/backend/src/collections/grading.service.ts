import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { SettlementEntity } from '../estates/settlement.entity';
import {
  gradedTotalKg,
  gradingState,
  toDbGrade,
  weightSummary,
  type PublicCollection,
  type PublicCorrectionRequest,
  type PublicRevision,
  type PublicRevisionLine,
} from './collection-map';
import { CollectionRecordEntity } from './collection-record.entity';
import { CollectionSettingsService } from './collection-settings.service';
import { type Actor } from './collections.service';
import { ComplaintEntity } from './complaint.entity';
import { DeliveryGradeLineEntity } from './delivery-grade-line.entity';
import { DeliveryGradeRevisionEntity } from './delivery-grade-revision.entity';
import { DecideCorrectionDto } from './dto/decide-correction.dto';
import { RequestCorrectionDto } from './dto/request-correction.dto';
import { SetGradeLinesDto } from './dto/set-grade-lines.dto';
import { GradeCorrectionRequestEntity } from './grade-correction-request.entity';
import {
  GradingNotificationService,
  cancelQueued,
  enqueueCorrection,
  enqueueGraded,
  releaseGraded,
} from './grading-notification.service';
import { GradingNotificationEntity } from './grading-notification.entity';
import { SettlementAdjustmentEntity } from './settlement-adjustment.entity';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** What the grading dialog needs to warn the officer before saving. */
export interface GradingContext {
  estateWeightKg: number;
  /** fraction, e.g. 0.05 */
  toleranceFraction: number;
  correctionWindowMin: number;
  /** This estate's usual delivery size from its recent graded deliveries; null when too little history. */
  usual: {
    medianKg: number;
    sampleSize: number;
    lowKg: number;
    highKg: number;
  } | null;
}

interface DtoLine {
  grade: 'Super' | 'Normal';
  weightKg: number;
}

/**
 * Grading lifecycle: OPEN (the window after grading) → LOCKED → SETTLED. Direct edits only
 * while OPEN; afterwards a correction request a Manager approves, applied as a NEW revision
 * (history is never overwritten). A correction on a SETTLED delivery creates a signed
 * settlement adjustment instead of touching the payment that was already made.
 */
@Injectable()
export class GradingService {
  constructor(
    @InjectRepository(CollectionRecordEntity)
    private readonly repo: Repository<CollectionRecordEntity>,
    @InjectRepository(DeliveryGradeRevisionEntity)
    private readonly revisions: Repository<DeliveryGradeRevisionEntity>,
    @InjectRepository(GradeCorrectionRequestEntity)
    private readonly requests: Repository<GradeCorrectionRequestEntity>,
    @InjectRepository(SettlementEntity)
    private readonly settlements: Repository<SettlementEntity>,
    @InjectRepository(GradingNotificationEntity)
    private readonly outbox: Repository<GradingNotificationEntity>,
    private readonly access: DispatchAccessService,
    private readonly settings: CollectionSettingsService,
    private readonly notifications: GradingNotificationService,
    private readonly audit: AuditService,
  ) {}

  async requireGradingEdit(actor: Actor): Promise<void> {
    await this.access.require(
      actor.role,
      'edit',
      'resend notifications',
      'grading',
    );
  }

  /* ── Grade / edit while OPEN ─────────────────────────────────── */

  async setGradeLines(
    id: string,
    dto: SetGradeLinesDto,
    actor: Actor,
  ): Promise<void> {
    await this.access.require(
      actor.role,
      'edit',
      'grade deliveries',
      'grading',
    );
    const record = await this.findEntity(id);
    const now = new Date();
    const lines = this.normaliseLines(dto.lines);

    const state = gradingState(record, now);
    let kind: 'initial' | 'open_edit';
    if (record.status === 'confirmed') {
      if (state !== 'open') {
        throw new ConflictException(
          state === 'settled'
            ? 'This delivery has been settled. Request a correction — a Manager approves it and any difference goes into the next settlement.'
            : 'The correction window has closed and this delivery is locked. Request a correction instead.',
        );
      }
      if (!dto.reason) {
        throw new BadRequestException(
          'A reason is required to edit a graded delivery.',
        );
      }
      kind = 'open_edit';
    } else if (record.status === 'collected') {
      kind = 'initial';
    } else {
      throw new BadRequestException(
        'Grading happens at the factory once the agent has collected — this record is not Collected yet.',
      );
    }

    const cfg = await this.settings.get();
    const before = weightSummary(record).gradeLines;

    await this.tx(async (m) => {
      this.applyLines(record, lines, actor.name, now);
      record.lastUpdatedBy = actor.name;
      record.lastUpdatedOn = now;
      if (kind === 'initial') {
        record.status = 'confirmed';
        record.gradedAt = now;
        // Snapshot: the window in force NOW decides when this delivery locks, forever.
        record.lockedAt = new Date(
          now.getTime() + cfg.correctionWindowMin * 60_000,
        );
        record.finalizedAt = null;
      }
      record.timeline = [
        ...record.timeline,
        {
          status: 'Confirmed',
          timestamp: now.toISOString(),
          by:
            kind === 'initial'
              ? `${actor.name} — graded ${describe(lines)}`
              : `${actor.name} — grading edited (${describe(lines)}): ${dto.reason}`,
        },
      ];
      await this.syncMismatch(
        m,
        record,
        sum(lines),
        cfg.mismatchTolerancePct / 100,
        actor,
      );
      const saved = await m.getRepository(CollectionRecordEntity).save(record);
      await this.addRevision(
        m,
        saved.id,
        kind,
        lines,
        dto.reason ?? null,
        actor.name,
        now,
      );
      if (kind === 'initial') {
        // Queued in the same transaction as the grading: the notification can't be lost to a crash.
        await enqueueGraded(
          m.getRepository(GradingNotificationEntity),
          saved.id,
          saved.lockedAt!,
          now,
        );
      }
    });

    await this.audit.record(actor, {
      action:
        kind === 'initial'
          ? 'Graded collection record'
          : 'Edited grading (open window)',
      module: 'Collection',
      record: id,
      recordHref: `/collections/${id}`,
      details:
        kind === 'initial'
          ? describe(lines)
          : `${describe(before)} → ${describe(lines)} — ${dto.reason}`,
    });
  }

  /** Close the window early; the held owner notification is released at the same moment. */
  async finalize(id: string, actor: Actor): Promise<void> {
    await this.access.require(
      actor.role,
      'edit',
      'finalize grading',
      'grading',
    );
    const record = await this.findEntity(id);
    const now = new Date();
    if (gradingState(record, now) !== 'open') {
      throw new ConflictException(
        record.status === 'confirmed'
          ? 'This delivery is already locked.'
          : 'Only a graded delivery can be finalized.',
      );
    }
    await this.tx(async (m) => {
      record.finalizedAt = now;
      record.lockedAt = now;
      record.lastUpdatedBy = actor.name;
      record.lastUpdatedOn = now;
      record.timeline = [
        ...record.timeline,
        {
          status: 'Confirmed',
          timestamp: now.toISOString(),
          by: `${actor.name} — grading finalized`,
        },
      ];
      await m.getRepository(CollectionRecordEntity).save(record);
      await releaseGraded(m.getRepository(GradingNotificationEntity), id, now);
    });
    await this.audit.record(actor, {
      action: 'Finalized grading',
      module: 'Collection',
      record: id,
      recordHref: `/collections/${id}`,
    });
  }

  /* ── Correction requests ─────────────────────────────────────── */

  async requestCorrection(
    id: string,
    dto: RequestCorrectionDto,
    actor: Actor,
  ): Promise<PublicCorrectionRequest> {
    await this.access.require(
      actor.role,
      'edit',
      'request grading corrections',
      'grading',
    );
    const record = await this.findEntity(id);
    const now = new Date();
    const state = gradingState(record, now);
    if (state === null) {
      throw new BadRequestException('Only a graded delivery can be corrected.');
    }
    if (state === 'open') {
      throw new ConflictException(
        'This delivery is still inside its correction window — edit it directly.',
      );
    }
    const lines = this.normaliseLines(dto.lines);
    if (sameLines(lines, weightSummary(record).gradeLines)) {
      throw new BadRequestException(
        'The requested grades are the same as the current ones.',
      );
    }
    const pending = await this.requests.findOne({
      where: { deliveryId: id, status: 'pending' },
    });
    if (pending) {
      throw new ConflictException(
        'A correction request is already waiting for a Manager on this delivery.',
      );
    }
    const saved = await this.requests.save(
      this.requests.create({
        deliveryId: id,
        lines,
        reason: dto.reason,
        status: 'pending',
        requestedBy: actor.name,
        requestedAt: now,
        decidedBy: null,
        decidedAt: null,
        decisionNote: null,
      }),
    );
    await this.audit.record(actor, {
      action: 'Requested grading correction',
      module: 'Collection',
      record: id,
      recordHref: `/collections/${id}`,
      details: `${describe(weightSummary(record).gradeLines)} → ${describe(lines)} — ${dto.reason}`,
    });
    return this.toPublicRequest(saved, record);
  }

  async approveCorrection(
    requestId: number,
    dto: DecideCorrectionDto,
    actor: Actor,
  ): Promise<string> {
    await this.access.require(
      actor.role,
      'approve',
      'approve grading corrections',
      'gradingApproval',
    );
    const request = await this.findRequest(requestId);
    if (request.status !== 'pending') {
      throw new ConflictException(
        `This request was already ${request.status}.`,
      );
    }
    const record = await this.findEntity(request.deliveryId);
    const now = new Date();
    const state = gradingState(record, now);
    if (state !== 'locked' && state !== 'settled') {
      throw new ConflictException(
        'This delivery can no longer be corrected through a request.',
      );
    }
    const cfg = await this.settings.get();
    const oldLines = weightSummary(record).gradeLines;
    const newLines = request.lines;

    // SETTLED: the paying settlement's rates price the difference. Resolved BEFORE the
    // transaction so a missing settlement refuses cleanly instead of half-applying.
    let adjustment: {
      settlement: SettlementEntity;
      amountRs: number;
      dSuper: number;
      dNormal: number;
    } | null = null;
    if (state === 'settled') {
      const settlement = await this.settlements.findOne({
        where: { id: record.settlementId! },
      });
      if (!settlement) {
        throw new ConflictException(
          `Settlement ${record.settlementId} for this delivery could not be found.`,
        );
      }
      const dSuper = kgOf(newLines, 'Super') - kgOf(oldLines, 'Super');
      const dNormal = kgOf(newLines, 'Normal') - kgOf(oldLines, 'Normal');
      adjustment = {
        settlement,
        dSuper,
        dNormal,
        amountRs: round2(
          dSuper * Number(settlement.superRate) +
            dNormal * Number(settlement.normalRate),
        ),
      };
    }

    await this.tx(async (m) => {
      this.applyLines(record, newLines, request.requestedBy, now);
      record.lastUpdatedBy = actor.name;
      record.lastUpdatedOn = now;
      record.timeline = [
        ...record.timeline,
        {
          status: 'Confirmed',
          timestamp: now.toISOString(),
          by: `${request.requestedBy} — correction approved by ${actor.name} (${describe(newLines)}): ${request.reason}`,
        },
      ];
      await this.syncMismatch(
        m,
        record,
        sum(newLines),
        cfg.mismatchTolerancePct / 100,
        actor,
      );
      await m.getRepository(CollectionRecordEntity).save(record);

      const revision = await this.addRevision(
        m,
        record.id,
        'correction',
        newLines,
        request.reason,
        request.requestedBy,
        now,
      );
      revision.approvedBy = actor.name;
      revision.approvedAt = now;
      revision.requestId = request.id;
      await m.getRepository(DeliveryGradeRevisionEntity).save(revision);

      request.status = 'approved';
      request.decidedBy = actor.name;
      request.decidedAt = now;
      request.decisionNote = dto.note ?? null;
      await m.getRepository(GradeCorrectionRequestEntity).save(request);

      if (adjustment) {
        await m.getRepository(SettlementAdjustmentEntity).save(
          m.getRepository(SettlementAdjustmentEntity).create({
            estateId: adjustment.settlement.estateId,
            deliveryId: record.id,
            requestId: request.id,
            originSettlementId: adjustment.settlement.id,
            superKgDelta: String(round2(adjustment.dSuper)),
            normalKgDelta: String(round2(adjustment.dNormal)),
            superRate: adjustment.settlement.superRate,
            normalRate: adjustment.settlement.normalRate,
            amountRs: String(adjustment.amountRs),
            status: 'pending',
            appliedSettlementId: null,
            createdAt: now,
          }),
        );
      }
      await enqueueCorrection(
        m.getRepository(GradingNotificationEntity),
        record.id,
        request.id,
        { old: oldLines, new: newLines, reason: request.reason },
        now,
      );
    });

    await this.audit.record(actor, {
      action: 'Approved grading correction',
      module: 'Collection',
      record: record.id,
      recordHref: `/collections/${record.id}`,
      details:
        `${describe(oldLines)} → ${describe(newLines)}` +
        (adjustment
          ? ` · settled in ${adjustment.settlement.id}: adjustment Rs. ${adjustment.amountRs} carried to the next settlement`
          : ''),
    });
    return record.id;
  }

  async rejectCorrection(
    requestId: number,
    dto: DecideCorrectionDto,
    actor: Actor,
  ): Promise<string> {
    await this.access.require(
      actor.role,
      'approve',
      'reject grading corrections',
      'gradingApproval',
    );
    if (!dto.note) {
      throw new BadRequestException(
        'Say why the correction is being rejected.',
      );
    }
    const request = await this.findRequest(requestId);
    if (request.status !== 'pending') {
      throw new ConflictException(
        `This request was already ${request.status}.`,
      );
    }
    const now = new Date();
    request.status = 'rejected';
    request.decidedBy = actor.name;
    request.decidedAt = now;
    request.decisionNote = dto.note;
    await this.requests.save(request);
    await this.audit.record(actor, {
      action: 'Rejected grading correction',
      module: 'Collection',
      record: request.deliveryId,
      recordHref: `/collections/${request.deliveryId}`,
      details: dto.note,
    });
    return request.deliveryId;
  }

  /** A delivery whose grading is voided: any queued owner notification is cancelled. */
  async cancelOwnerNotification(deliveryId: string): Promise<void> {
    await cancelQueued(this.outbox, deliveryId, new Date());
  }

  /* ── Reads ───────────────────────────────────────────────────── */

  /** Adds the detail-page extras to a PublicCollection. */
  async decorate(pub: PublicCollection): Promise<PublicCollection> {
    const [revs, pending, status] = await Promise.all([
      this.revisions.find({ where: { deliveryId: pub.id } }),
      this.requests.findOne({
        where: { deliveryId: pub.id, status: 'pending' },
      }),
      this.notifications.statusFor(pub.id),
    ]);
    return {
      ...pub,
      revisionCount: Math.max(0, revs.length - 1),
      pendingCorrectionId: pending?.id,
      notificationStatus: status,
    };
  }

  async listRevisions(id: string): Promise<PublicRevision[]> {
    await this.findEntity(id);
    const rows = await this.revisions.find({ where: { deliveryId: id } });
    return rows
      .sort((a, b) => a.revisionNo - b.revisionNo)
      .map((r) => ({
        revisionNo: r.revisionNo,
        kind: r.kind,
        lines: r.lines,
        totalKg: Number(r.totalKg),
        reason: r.reason,
        changedBy: r.changedBy,
        changedAt: r.changedAt.toISOString(),
        approvedBy: r.approvedBy,
        approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
      }));
  }

  async listCorrections(id: string): Promise<PublicCorrectionRequest[]> {
    const record = await this.findEntity(id);
    const rows = await this.requests.find({ where: { deliveryId: id } });
    return Promise.all(
      rows
        .sort((a, b) => b.id - a.id)
        .map((r) => this.toPublicRequest(r, record)),
    );
  }

  async context(id: string): Promise<GradingContext> {
    const record = await this.findEntity(id);
    const cfg = await this.settings.get();
    let usual: GradingContext['usual'] = null;
    if (record.estateId !== null) {
      const history = (
        await this.repo.find({
          where: { estateId: record.estateId, status: 'confirmed' },
        })
      )
        .filter((r) => r.id !== id && r.gradeLines.length > 0)
        .sort((a, b) => b.collectionDate.localeCompare(a.collectionDate))
        .slice(0, 10)
        .map((r) => gradedTotalKg(r))
        .sort((a, b) => a - b);
      if (history.length >= 3) {
        const mid = Math.floor(history.length / 2);
        const median =
          history.length % 2
            ? history[mid]
            : (history[mid - 1] + history[mid]) / 2;
        usual = {
          medianKg: round2(median),
          sampleSize: history.length,
          lowKg: round2(median * cfg.usualRangeLow),
          highKg: round2(median * cfg.usualRangeHigh),
        };
      }
    }
    return {
      estateWeightKg: Number(record.weightKg),
      toleranceFraction: cfg.mismatchTolerancePct / 100,
      correctionWindowMin: cfg.correctionWindowMin,
      usual,
    };
  }

  /* ── internals ───────────────────────────────────────────────── */

  private async toPublicRequest(
    r: GradeCorrectionRequestEntity,
    record: CollectionRecordEntity,
  ): Promise<PublicCorrectionRequest> {
    const currentLines = weightSummary(record).gradeLines;
    const out: PublicCorrectionRequest = {
      id: r.id,
      deliveryId: r.deliveryId,
      lines: r.lines,
      currentLines,
      reason: r.reason,
      status: r.status,
      requestedBy: r.requestedBy,
      requestedAt: r.requestedAt.toISOString(),
      decidedBy: r.decidedBy,
      decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
      decisionNote: r.decisionNote,
    };
    if (r.status === 'pending') {
      let adjustmentRs = 0;
      if (record.settlementId) {
        const s = await this.settlements.findOne({
          where: { id: record.settlementId },
        });
        if (s) {
          adjustmentRs = round2(
            (kgOf(r.lines, 'Super') - kgOf(currentLines, 'Super')) *
              Number(s.superRate) +
              (kgOf(r.lines, 'Normal') - kgOf(currentLines, 'Normal')) *
                Number(s.normalRate),
          );
        }
      }
      out.impact = {
        settled: Boolean(record.settlementId),
        settlementId: record.settlementId,
        adjustmentRs,
      };
    }
    return out;
  }

  /** One line per grade, Super before Normal; a duplicate grade is a 409. */
  private normaliseLines(lines: DtoLine[]): PublicRevisionLine[] {
    const grades = lines.map((l) => toDbGrade(l.grade));
    if (new Set(grades).size !== grades.length) {
      throw new ConflictException(
        'A delivery can have only one grade line per grade.',
      );
    }
    return [...lines]
      .sort(
        (a, b) =>
          (a.grade === 'Super' ? -1 : 1) - (b.grade === 'Super' ? -1 : 1),
      )
      .map((l) => ({ grade: l.grade, weightKg: l.weightKg }));
  }

  /**
   * Reuse a line's row when its grade is unchanged (updates in place — avoids tripping
   * UNIQUE(delivery_id, grade)); lines missing from the new set are orphan-deleted.
   */
  private applyLines(
    record: CollectionRecordEntity,
    lines: PublicRevisionLine[],
    gradedBy: string,
    now: Date,
  ): void {
    const existing = new Map(
      (record.gradeLines ?? []).map((l) => [l.grade, l]),
    );
    record.gradeLines = lines.map((l) => {
      const grade = toDbGrade(l.grade);
      const line = existing.get(grade) ?? new DeliveryGradeLineEntity();
      line.grade = grade;
      line.weightKg = String(l.weightKg);
      line.gradedBy = gradedBy;
      line.gradedAt = now;
      return line;
    });
  }

  private async addRevision(
    m: EntityManager,
    deliveryId: string,
    kind: 'initial' | 'open_edit' | 'correction',
    lines: PublicRevisionLine[],
    reason: string | null,
    changedBy: string,
    now: Date,
  ): Promise<DeliveryGradeRevisionEntity> {
    const repo = m.getRepository(DeliveryGradeRevisionEntity);
    const existing = await repo.find({ where: { deliveryId } });
    const next = existing.reduce((mx, r) => Math.max(mx, r.revisionNo), 0) + 1;
    return repo.save(
      repo.create({
        deliveryId,
        revisionNo: next,
        kind,
        lines,
        totalKg: String(round2(sum(lines))),
        reason,
        changedBy,
        changedAt: now,
        approvedBy: null,
        approvedAt: null,
        requestId: null,
      }),
    );
  }

  /**
   * Weight-mismatch complaint follows the CURRENT grading: raised (or refreshed) when the
   * total strays from the estate weight beyond the tolerance, resolved when a fix brings it
   * back within.
   */
  private async syncMismatch(
    m: EntityManager,
    record: CollectionRecordEntity,
    total: number,
    tolerance: number,
    actor: Actor,
  ): Promise<void> {
    const estateKg = Number(record.weightKg);
    const diff = estateKg > 0 ? Math.abs(total - estateKg) / estateKg : 0;
    const complaints = m.getRepository(ComplaintEntity);
    const open = await complaints.findOne({
      where: {
        collectionRecordId: record.id,
        type: 'weight_mismatch',
        status: 'open',
      },
    });
    if (diff > tolerance) {
      const note = `Estate weight ${estateKg} kg vs factory graded total ${round2(total)} kg (${(diff * 100).toFixed(1)}% apart).`;
      if (open) {
        open.description = note;
        await complaints.save(open);
        record.mismatch = { complaintId: `C-${open.id}`, note };
      } else {
        let complaintId = 'unfiled';
        if (actor.sub) {
          const complaint = await complaints.save(
            complaints.create({
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
    } else {
      if (open) {
        open.status = 'resolved';
        await complaints.save(open);
      }
      record.mismatch = null;
    }
  }

  private tx<T>(fn: (m: EntityManager) => Promise<T>): Promise<T> {
    return this.repo.manager.transaction(fn);
  }

  private async findEntity(id: string): Promise<CollectionRecordEntity> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`No collection record "${id}".`);
    return record;
  }

  private async findRequest(id: number): Promise<GradeCorrectionRequestEntity> {
    const r = await this.requests.findOne({ where: { id } });
    if (!r) throw new NotFoundException(`No correction request #${id}.`);
    return r;
  }
}

/* ── small pure helpers ── */

const sum = (lines: PublicRevisionLine[]) =>
  lines.reduce((s, l) => s + l.weightKg, 0);

const kgOf = (lines: PublicRevisionLine[], grade: 'Super' | 'Normal') =>
  lines.filter((l) => l.grade === grade).reduce((s, l) => s + l.weightKg, 0);

function describe(lines: PublicRevisionLine[]): string {
  return lines.length === 0
    ? 'ungraded'
    : lines.map((l) => `${l.grade} ${l.weightKg} kg`).join(', ');
}

function sameLines(a: PublicRevisionLine[], b: PublicRevisionLine[]): boolean {
  const key = (ls: PublicRevisionLine[]) =>
    [...ls]
      .sort((x, y) => x.grade.localeCompare(y.grade))
      .map((l) => `${l.grade}:${l.weightKg}`)
      .join('|');
  return key(a) === key(b);
}
