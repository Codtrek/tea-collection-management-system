import {
  Check,
  Column,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FertilizerRequestEntity } from './fertilizer-request.entity';
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
@Check(
  'fertilizer_notifications_kind_check',
  `((kind)::text = ANY ((ARRAY['approved'::character varying, 'partially_approved'::character varying, 'rejected'::character varying, 'dispatched'::character varying, 'delivered'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[]))`,
)
@Check(
  'fertilizer_notifications_status_check',
  `((status)::text = ANY ((ARRAY['queued'::character varying, 'sending'::character varying, 'sent'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[]))`,
)
@Index('idx_fert_notifications_due', ['status', 'sendAfter'])
export class FertilizerNotificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_id' })
  @ForeignKey(() => FertilizerRequestEntity, {
    name: 'fertilizer_notifications_request_id_fkey',
  })
  requestId: number;

  @Column({ type: 'varchar', length: 20 })
  kind: NotificationKind;

  @Column({ type: 'varchar', default: 'queued', length: 10 })
  status: FertilizerNotificationStatus;

  @Column({ name: 'send_after', type: 'timestamptz', default: () => 'now()' })
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

  @Column({ name: 'dedupe_key', type: 'varchar', length: 80, unique: true })
  dedupeKey: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
