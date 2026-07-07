import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { PickupStatus } from '../pickup-status.util';

@Entity('pickup_requests')
export class PickupRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  estate_id: number;

  @Column()
  owner_id: number;

  @Column()
  factory_id: number;

  @Column({ type: 'int', nullable: true })
  route_stop_id: number | null;

  @Column({ type: 'date' })
  request_date: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: PickupStatus;

  @Column({ type: 'varchar', nullable: true })
  decline_reason: string | null;

  @Column({ type: 'decimal', nullable: true })
  estimated_weight_kg: number | null;

  @Column({ type: 'decimal', nullable: true })
  gps_pin_lat: number | null;

  @Column({ type: 'decimal', nullable: true })
  gps_pin_lng: number | null;

  @CreateDateColumn()
  requested_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date | null;
}
