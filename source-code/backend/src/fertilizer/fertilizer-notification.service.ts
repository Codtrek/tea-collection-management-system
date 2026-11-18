import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DevicePushTokenEntity } from '../dispatch/device-push-token.entity';
import { DispatchNotifier } from '../dispatch/dispatch-notifier.service';
import { EstateOwnerEntity } from '../estates/estate-owner.entity';
import type { NoticeStatus, NotificationKind } from './fertilizer-map';
import { FertilizerNotificationEntity } from './fertilizer-notification.entity';
import { FertilizerRequestEntity } from './fertilizer-request.entity';

/** A 'sending' row older than this was claimed by a process that died — it goes back in the queue. */
export const STALE_SENDING_MS = 5 * 60_000;

export type NoticePayload = Record<string, string | number | boolean | null>;

/**
 * Queue an owner notice. Idempotent on `dedupeKey`: a retried action never queues the same
 * notice twice. A plain function over a repository so it can run on a transaction's manager.
 */
export async function enqueueNotice(
  repo: Repository<FertilizerNotificationEntity>,
  input: {
    requestId: number;
    kind: NotificationKind;
    payload: NoticePayload;
    dedupeKey: string;
    now: Date;
  },
): Promise<FertilizerNotificationEntity> {
  const existing = await repo.findOne({
    where: { dedupeKey: input.dedupeKey },
  });
  if (existing) return existing;
  return repo.save(
    repo.create({
      requestId: input.requestId,
      kind: input.kind,
      status: 'queued',
      sendAfter: input.now,
      attempts: 0,
      lastError: null,
      sentAt: null,
      deviceDelivered: null,
      payload: input.payload,
      dedupeKey: input.dedupeKey,
      createdAt: input.now,
      updatedAt: input.now,
    }),
  );
}

/** The single mapping from an outbox row to what FERT-05/06 show. */
export function noticeStatusOf(
  row: Pick<FertilizerNotificationEntity, 'status' | 'deviceDelivered'>,
): NoticeStatus {
  if (row.status === 'failed') return 'Failed';
  if (row.status === 'cancelled') return 'Cancelled';
  if (row.status === 'queued' || row.status === 'sending') return 'Queued';
  return row.deviceDelivered === false ? 'Stored, not delivered' : 'Sent';
}

type PayloadValue = string | number | boolean | null | undefined;
const kg = (n: PayloadValue) => `${Number(n)} kg`;
const rs = (n: PayloadValue) =>
  `Rs. ${Number(n).toLocaleString('en-LK', { maximumFractionDigits: 2 })}`;
const str = (v: string | number | boolean | null | undefined) =>
  v === null || v === undefined ? '' : String(v);

/** Owner wording (Fertilizer-Delivery-Addendum §9). Everything comes from the queued payload. */
export function renderNotice(
  kind: NotificationKind,
  p: NoticePayload,
): { title: string; body: string } {
  const item = str(p.item);
  const ref = str(p.requestRef);
  switch (kind) {
    case 'approved':
      return {
        title: `Fertilizer approved: ${item}`,
        body: `Your request ${ref} for ${kg(p.approvedKg)} of ${item} is approved. Payment: ${str(p.method)}. We'll tell you the delivery date.`,
      };
    case 'partially_approved':
      return {
        title: `Fertilizer partly approved: ${item}`,
        body: `Your request ${ref}: ${kg(p.approvedKg)} of the ${kg(p.requestedKg)} of ${item} you asked for is approved. Reason: ${str(p.reason)}. Payment: ${str(p.method)}.`,
      };
    case 'rejected':
      return {
        title: `Fertilizer request not approved: ${item}`,
        body: `Your request ${ref} for ${kg(p.requestedKg)} of ${item} was not approved. Reason: ${str(p.reason)}.`,
      };
    case 'dispatched':
      return {
        title: `Fertilizer delivery on ${str(p.date)}`,
        body: `${kg(p.qtyKg)} of ${item} (request ${ref}) will come with the collection agent on ${str(p.date)} (${str(p.routeName)}).`,
      };
    case 'delivered':
      return {
        title: `Fertilizer delivered: ${item}`,
        body: `${kg(p.qtyKg)} of ${item} was delivered on ${str(p.date)} (request ${ref}). Amount owed: ${rs(p.amountRs)} — ${str(p.method)}.`,
      };
    case 'failed':
      return p.newDate
        ? {
            title: `Fertilizer delivery rescheduled to ${str(p.newDate)}`,
            body: `We couldn't deliver ${item} (request ${ref}) on ${str(p.date)}: ${str(p.reason)}. The new delivery date is ${str(p.newDate)}.`,
          }
        : {
            title: `Fertilizer delivery not completed: ${item}`,
            body: `We couldn't deliver ${item} (request ${ref}) on ${str(p.date)}: ${str(p.reason)}. The factory will contact you about the next step.`,
          };
    case 'cancelled':
      return {
        title: `Fertilizer request cancelled: ${item}`,
        body: `Your request ${ref} for ${item} was cancelled. Reason: ${str(p.reason)}.`,
      };
  }
}

/**
 * Sends queued owner notices: in-app row for the owner's account (+ push when he has a
 * registered device). Owners have no app yet, so most go out as "Stored, not delivered".
 * Claim is compare-and-swap (queued → sending), so several instances never double-send.
 */
@Injectable()
export class FertilizerNotificationService {
  constructor(
    @InjectRepository(FertilizerNotificationEntity)
    private readonly outbox: Repository<FertilizerNotificationEntity>,
    @InjectRepository(FertilizerRequestEntity)
    private readonly requests: Repository<FertilizerRequestEntity>,
    @InjectRepository(EstateOwnerEntity)
    private readonly owners: Repository<EstateOwnerEntity>,
    @InjectRepository(DevicePushTokenEntity)
    private readonly tokens: Repository<DevicePushTokenEntity>,
    private readonly notifier: DispatchNotifier,
  ) {}

  /** Returns how many were sent. */
  async sweep(now: Date = new Date()): Promise<number> {
    for (const row of await this.outbox.find({
      where: { status: 'sending' },
    })) {
      if (now.getTime() - row.updatedAt.getTime() > STALE_SENDING_MS) {
        await this.outbox.update(
          { id: row.id, status: 'sending' },
          { status: 'queued', updatedAt: now },
        );
      }
    }
    const due = (await this.outbox.find({ where: { status: 'queued' } }))
      .filter((r) => r.sendAfter.getTime() <= now.getTime())
      .sort((a, b) => a.id - b.id)
      .slice(0, 50);

    let sent = 0;
    for (const row of due) {
      const claim = await this.outbox.update(
        { id: row.id, status: 'queued' },
        { status: 'sending', attempts: row.attempts + 1, updatedAt: now },
      );
      if (claim.affected !== 1) continue;
      if (await this.sendOne(row, now)) sent += 1;
    }
    return sent;
  }

  private async sendOne(
    row: FertilizerNotificationEntity,
    now: Date,
  ): Promise<boolean> {
    try {
      const request = await this.requests.findOne({
        where: { id: row.requestId },
      });
      const owner = request
        ? await this.owners.findOne({ where: { id: request.ownerId } })
        : null;
      if (!owner) {
        await this.outbox.update(
          { id: row.id },
          {
            status: 'failed',
            lastError: 'This estate has no owner account to notify.',
            updatedAt: now,
          },
        );
        return false;
      }
      const message = renderNotice(row.kind, row.payload);
      await this.notifier.deliverToUser(owner.userId, {
        type:
          row.kind === 'approved' ||
          row.kind === 'partially_approved' ||
          row.kind === 'rejected'
            ? 'fertilizer_approval'
            : 'fertilizer_update',
        title: message.title,
        body: message.body,
        referenceId: row.requestId,
        referenceType: 'fertilizer_requests',
        dedupeKey: `fert:${row.dedupeKey}`.slice(0, 80),
      });
      const devices = await this.tokens.find({
        where: { userId: owner.userId },
      });
      await this.outbox.update(
        { id: row.id },
        {
          status: 'sent',
          sentAt: now,
          lastError: null,
          deviceDelivered: devices.length > 0,
          updatedAt: now,
        },
      );
      return true;
    } catch (err) {
      await this.outbox.update(
        { id: row.id },
        {
          status: 'failed',
          lastError: (err as Error).message.slice(0, 500),
          updatedAt: now,
        },
      );
      return false;
    }
  }
}
