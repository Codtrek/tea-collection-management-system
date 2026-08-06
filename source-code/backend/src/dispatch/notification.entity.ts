import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type NotificationType =
  | 'cover_request'
  | 'cover_response'
  | 'missed_checkin'
  | 'route_reassigned'
  | 'exception_request'
  | 'collection_complete';

/** In-app notification row (the `notifications` table). Dispatch is its first writer. */
@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar' })
  type: NotificationType;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'reference_id', type: 'int', nullable: true })
  referenceId: number | null;

  @Column({ name: 'reference_type', type: 'varchar', nullable: true })
  referenceType: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
