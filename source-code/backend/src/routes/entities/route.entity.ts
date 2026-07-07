import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { RouteStatus } from '../route-status.util';

@Entity('routes')
export class RouteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  factory_id: number;

  @Column({ type: 'int', nullable: true })
  truck_id: number | null;

  @Column()
  collector_id: number;

  @Column({ type: 'varchar', nullable: true })
  driver_name: string | null;

  @Column({ type: 'date' })
  route_date: string;

  @Column({ type: 'varchar', default: 'scheduled' })
  status: RouteStatus;

  @Column({ type: 'varchar', nullable: true })
  status_reason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
