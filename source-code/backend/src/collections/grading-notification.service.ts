import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { DispatchNotifier } from '../dispatch/dispatch-notifier.service';
import { EstateOwnerEntity } from '../estates/estate-owner.entity';
import { EstateEntity } from '../estates/estate.entity';
import {
  gradingState,
  weightSummary,
  type NotificationStatus,
  type PublicRevisionLine,
} from './collection-map';
import { CollectionRecordEntity } from './collection-record.entity';
import { CollectionSettingsService } from './collection-settings.service';
import {
  GradingNotificationEntity,
  type GradingNotificationStatus,
} from './grading-notification.entity';

/** A 'sending' row older than this was claimed by a process that died — it is put back in the queue. */
export const STALE_SENDING_MS = 5 * 60_000;

/* ── Queue operations — plain functions over a repository so the grading transaction can
 *    run them on its own EntityManager (the notification is queued atomically with the grading). ── */

/** Idempotent: a second call for the same delivery returns the existing row untouched. */
export async function enqueueGraded(
  repo: Repository<GradingNotificationEntity>,
  deliveryId: string,
  sendAfter: Date,
  now: Date,
): Promise<GradingNotificationEntity> {
  const dedupeKey = `graded:${deliveryId}`;
  const existing = await repo.findOne({ where: { dedupeKey } });
  if (existing) return existing;
  return repo.save(
    repo.create({
      deliveryId,
      kind: 'graded',
      status: 'queued',
      sendAfter,
      attempts: 0,
      lastError: null,
      sentAt: null,
      payload: null,
      dedupeKey,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

/** Finalize: the held notification may go out now. Only touches a still-queued row. */
export async function releaseGraded(
  repo: Repository<GradingNotificationEntity>,
  deliveryId: string,
  now: Date,
): Promise<void> {
  await repo.update(
    { dedupeKey: `graded:${deliveryId}`, status: 'queued' },
    { sendAfter: now, updatedAt: now },
  );
}

/** The delivery's grading was voided — a queued notification must never go out. */
export async function cancelQueued(
  repo: Repository<GradingNotificationEntity>,
  deliveryId: string,
  now: Date,
): Promise<void> {
  await repo.update(
    { deliveryId, status: 'queued' },
    { status: 'cancelled', updatedAt: now },
  );
}

/**
 * A correction was approved. If the original already left (sent / being sent) the owner
 * gets a NEW labelled notification showing old → new and the original is never touched.
 * If the original is still held (or failed, i.e. the owner never saw it) there is nothing
 * to correct: it renders the latest values when it goes out.
 */
export async function enqueueCorrection(
  repo: Repository<GradingNotificationEntity>,
  deliveryId: string,
  requestId: number,
  payload: NonNullable<GradingNotificationEntity['payload']>,
  now: Date,
): Promise<GradingNotificationEntity | null> {
  const original = await repo.findOne({
    where: { dedupeKey: `graded:${deliveryId}` },
  });
  if (
    !original ||
    (original.status !== 'sent' && original.status !== 'sending')
  ) {
    return null;
  }
  const dedupeKey = `correction:${requestId}`;
  const existing = await repo.findOne({ where: { dedupeKey } });
  if (existing) return existing;
  return repo.save(
    repo.create({
      deliveryId,
      kind: 'correction',
      status: 'queued',
      sendAfter: now,
      attempts: 0,
      lastError: null,
      sentAt: null,
      payload,
      dedupeKey,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

const kg = (n: number) => `${Number(n.toFixed(2))} kg`;

function describeLines(lines: PublicRevisionLine[]): string {
  return lines.map((l) => `${kg(l.weightKg)} ${l.grade}`).join(', ');
}

@Injectable()
export class GradingNotificationService {
  constructor(
    @InjectRepository(GradingNotificationEntity)
    private readonly outbox: Repository<GradingNotificationEntity>,
    @InjectRepository(CollectionRecordEntity)
    private readonly records: Repository<CollectionRecordEntity>,
    @InjectRepository(EstateEntity)
    private readonly estates: Repository<EstateEntity>,
    @InjectRepository(EstateOwnerEntity)
    private readonly owners: Repository<EstateOwnerEntity>,
    private readonly notifier: DispatchNotifier,
    private readonly settings: CollectionSettingsService,
    private readonly audit: AuditService,
  ) {}

  /** The status shown on the delivery detail — the latest notification wins. */
  async statusFor(deliveryId: string): Promise<NotificationStatus | undefined> {
    const rows = await this.outbox.find({ where: { deliveryId } });
    if (rows.length === 0) return undefined;
    const latest = [...rows].sort((a, b) => b.id - a.id)[0];
    const s: GradingNotificationStatus = latest.status;
    if (s === 'failed') return 'Failed';
    if (s === 'cancelled') return 'Cancelled';
    if (s === 'queued' || s === 'sending') return 'Queued';
    return latest.kind === 'correction' ? 'Correction sent' : 'Sent';
  }

  /** Officer resend of a failed notification. */
  async resend(
    deliveryId: string,
    actor: { name: string; role: string; sub?: number | null },
  ): Promise<void> {
    const rows = await this.outbox.find({
      where: { deliveryId, status: 'failed' },
    });
    if (rows.length === 0) {
      throw new ConflictException(
        'There is no failed notification to resend for this delivery.',
      );
    }
    const now = new Date();
    for (const row of rows) {
      await this.outbox.update(
        { id: row.id, status: 'failed' },
        { status: 'queued', sendAfter: now, lastError: null, updatedAt: now },
      );
    }
    await this.audit.record(actor as never, {
      action: 'Resent owner notification',
      module: 'Collection',
      record: deliveryId,
      recordHref: `/collections/${deliveryId}`,
    });
  }

  /** Returns how many were sent successfully. */
  async sweep(now: Date = new Date()): Promise<number> {
    // A process that died mid-send left its claim behind: release it.
    const sending = await this.outbox.find({ where: { status: 'sending' } });
    for (const row of sending) {
      if (now.getTime() - row.updatedAt.getTime() > STALE_SENDING_MS) {
        await this.outbox.update(
          { id: row.id, status: 'sending' },
          { status: 'queued', updatedAt: now },
        );
      }
    }

    const queued = await this.outbox.find({ where: { status: 'queued' } });
    const due = queued
      .filter((r) => r.sendAfter.getTime() <= now.getTime())
      .sort((a, b) => a.id - b.id)
      .slice(0, 50);

    let sent = 0;
    for (const row of due) {
      // Claim: only one process can move queued → sending for a given row.
      const claim = await this.outbox.update(
        { id: row.id, status: 'queued' },
        { status: 'sending', attempts: row.attempts + 1, updatedAt: now },
      );
      if (claim.affected !== 1) continue;
      if (await this.sendOne({ ...row, attempts: row.attempts + 1 }, now))
        sent += 1;
    }
    return sent;
  }

  private async sendOne(
    row: GradingNotificationEntity,
    now: Date,
  ): Promise<boolean> {
    const fail = async (message: string) => {
      await this.outbox.update(
        { id: row.id },
        { status: 'failed', lastError: message.slice(0, 500), updatedAt: now },
      );
      return false;
    };
    try {
      const record = await this.records.findOne({
        where: { id: row.deliveryId },
      });
      if (!record) {
        await this.outbox.update(
          { id: row.id },
          { status: 'cancelled', updatedAt: now },
        );
        return false;
      }
      // Safety net: never release a graded notice while the delivery can still be edited.
      if (
        row.kind === 'graded' &&
        gradingState(record, now) === 'open' &&
        record.lockedAt
      ) {
        await this.outbox.update(
          { id: row.id },
          { status: 'queued', sendAfter: record.lockedAt, updatedAt: now },
        );
        return false;
      }
      if (record.gradeLines.length === 0) {
        // Graded to nothing / voided: there is nothing true to tell the owner.
        await this.outbox.update(
          { id: row.id },
          { status: 'cancelled', updatedAt: now },
        );
        return false;
      }

      const estate =
        record.estateId === null
          ? null
          : await this.estates.findOne({ where: { id: record.estateId } });
      const owner = estate
        ? await this.owners.findOne({ where: { id: estate.ownerId } })
        : null;
      if (!owner) return fail('This estate has no owner account to notify.');

      const tolerance = (await this.settings.get()).mismatchTolerancePct / 100;
      const message = this.render(row, record, tolerance);
      await this.notifier.deliverToUser(owner.userId, {
        type:
          row.kind === 'correction' ? 'grade_correction' : 'delivery_graded',
        title: message.title,
        body: message.body,
        referenceType: 'tea_collection_records',
        dedupeKey: row.dedupeKey,
      });
      await this.outbox.update(
        { id: row.id },
        { status: 'sent', sentAt: now, lastError: null, updatedAt: now },
      );
      return true;
    } catch (err) {
      return fail((err as Error).message);
    }
  }

  /** Neutral wording, no accusation. Built from the CURRENT values at send time. */
  render(
    row: Pick<GradingNotificationEntity, 'kind' | 'payload'>,
    record: CollectionRecordEntity,
    tolerance: number,
  ): { title: string; body: string } {
    const summary = weightSummary(record);
    const estate = record.estateName;
    const date = record.collectionDate;

    if (row.kind === 'correction' && row.payload) {
      const before = row.payload.old.reduce((s, l) => s + l.weightKg, 0);
      const after = row.payload.new.reduce((s, l) => s + l.weightKg, 0);
      return {
        title: `Correction: ${estate} delivery ${record.id}`,
        body:
          `Correction for delivery ${record.id} (${estate}, ${date}). ` +
          `Before: ${kg(before)} — ${describeLines(row.payload.old)}. ` +
          `Now: ${kg(after)} — ${describeLines(row.payload.new)}. ` +
          `The earlier notice stays on record.`,
      };
    }

    const gap =
      summary.estateWeightKg > 0
        ? Math.abs(summary.weightKg - summary.estateWeightKg) /
          summary.estateWeightKg
        : 0;
    const note =
      gap > tolerance
        ? ` The estate recorded ${kg(summary.estateWeightKg)} and the factory recorded ${kg(summary.weightKg)}; both figures are on file.`
        : '';
    return {
      title: `Delivery received: ${estate}`,
      body:
        `The factory received ${kg(summary.weightKg)} from ${estate} on ${date}: ` +
        `${describeLines(summary.gradeLines)}. ` +
        `Delivery ${record.id}; estate weight ${kg(summary.estateWeightKg)}.${note}`,
    };
  }

  /** For an officer: confirm the delivery exists before acting on its notification. */
  async assertDelivery(deliveryId: string): Promise<void> {
    const record = await this.records.findOne({ where: { id: deliveryId } });
    if (!record)
      throw new NotFoundException(`No collection record "${deliveryId}".`);
  }
}
