import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type NotificationType =
  | 'cover_request'
  | 'cover_response'
  | 'missed_checkin'
  | 'route_reassigned'
  | 'exception_request'
  | 'collection_complete'
  | 'delivery_graded'
  | 'grade_correction';

/** In-app notification row (the `notifications` table). Dispatch is its first writer. */
/**
 * The DB CHECK allows more types than this module writes (the rest belong to
 * other flows); it is mirrored in full so TypeORM keeps it.
 */
@Entity('notifications')
@Check(
  'notifications_type_check',
  `"type" IN ('delivery_confirmation', 'otp', 'complaint', 'fertilizer_approval', 'payment_update', 'collection_complete', 'no_agents', 'cover_request', 'cover_response', 'missed_checkin', 'route_reassigned', 'exception_request', 'delivery_graded', 'grade_correction')`,
)
@Index('idx_notifications_is_read', ['isRead'])
@Index('idx_notifications_user', ['userId'])
@Index('uq_notifications_dedupe', ['dedupeKey'], {
  unique: true,
  where: `"dedupe_key" IS NOT NULL`,
})
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  @ForeignKey(() => User, { name: 'notifications_user_id_fkey' })
  userId: number;

  @Column({ type: 'varchar', length: 50 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 150, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  /** Nullable in the DB, but always filled by its default. */
  @Column({ name: 'is_read', nullable: true, default: false })
  isRead: boolean;

  @Column({ name: 'reference_id', type: 'int', nullable: true })
  referenceId: number | null;

  @Column({
    name: 'reference_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  referenceType: string | null;

  /** Optional idempotency key (UNIQUE when set): a retried send can never store a second row. */
  @Column({ name: 'dedupe_key', type: 'varchar', length: 80, nullable: true })
  dedupeKey: string | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
