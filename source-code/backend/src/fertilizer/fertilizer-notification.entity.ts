import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { NotificationKind } from './fertilizer-map';

export type FertilizerNotificationStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled';

/**
 * Owner-notice outbox for fertilizer requests — same claim / sweep / dedupe design as
 * `grading_notifications`. `payload` carries everything the message says, captured when
 * it was queued (reason, quantities, dates, amount owed).
 */
@Entity('fertilizer_notifications')
export class FertilizerNotificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_id' })
  requestId: number;

  @Column({ type: 'varchar' })
  kind: NotificationKind;

  @Column({ type: 'varchar', default: 'queued' })
  status: FertilizerNotificationStatus;

  @Column({ name: 'send_after', type: 'timestamptz' })
  sendAfter: Date;

  @Column({ default: 0 })
  attempts: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  /** false = stored for the owner's account but no registered device to push to */
  @Column({ name: 'device_delivered', type: 'boolean', nullable: true })
  deviceDelivered: boolean | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload: Record<string, string | number | boolean | null>;

  @Column({ name: 'dedupe_key', type: 'varchar' })
  dedupeKey: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
