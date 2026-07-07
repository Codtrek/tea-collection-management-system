import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type NotificationType =
  | 'route_active'
  | 'route_delayed'
  | 'route_cancelled'
  | 'pickup_expired'
  | 'delivery_confirmation'
  | 'complaint'
  | 'fertilizer_approval'
  | 'payment_update'
  | 'collection_complete';

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column({ type: 'varchar' })
  type: NotificationType;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @Column({ type: 'varchar', nullable: true })
  body: string | null;

  @Column({ default: false })
  is_read: boolean;

  @Column({ type: 'int', nullable: true })
  reference_id: number | null;

  @Column({ type: 'varchar', nullable: true })
  reference_type: string | null;

  @CreateDateColumn()
  created_at: Date;
}
