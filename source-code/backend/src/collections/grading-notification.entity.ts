import {
  Check,
  Column,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CollectionRecordEntity } from './collection-record.entity';
import type { PublicRevisionLine } from './collection-map';

export type GradingNotificationStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled';

/**
 * The outbox for "the factory received X kg from your estate". A row is queued when the
 * grading is saved and released when the correction window ends (or on Finalize). It lives
 * in Postgres so it survives a restart, and `dedupeKey` (UNIQUE) makes enqueueing idempotent.
 */
@Entity('grading_notifications')
@Check('grading_notifications_kind_check', `"kind" IN ('graded', 'correction')`)
@Check(
  'grading_notifications_status_check',
  `"status" IN ('queued', 'sending', 'sent', 'failed', 'cancelled')`,
)
@Index('idx_grading_notifications_due', ['status', 'sendAfter'])
export class GradingNotificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'delivery_id', type: 'varchar', length: 20 })
  @ForeignKey(() => CollectionRecordEntity, {
    name: 'grading_notifications_delivery_id_fkey',
    onDelete: 'CASCADE',
  })
  deliveryId: string;

  @Column({ type: 'varchar', length: 12 })
  kind: 'graded' | 'correction';

  @Column({ type: 'varchar', length: 10, default: 'queued' })
  status: GradingNotificationStatus;

  @Column({ name: 'send_after', type: 'timestamptz' })
  sendAfter: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  /** correction: the old and new lines + the reason, frozen when approved. */
  @Column({ type: 'jsonb', nullable: true })
  payload: {
    old: PublicRevisionLine[];
    new: PublicRevisionLine[];
    reason: string;
  } | null;

  @Column({ name: 'dedupe_key', type: 'varchar', length: 80, unique: true })
  dedupeKey: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
