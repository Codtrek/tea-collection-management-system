import {
  Column,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FertilizerRequestEntity } from './fertilizer-request.entity';

/** The request's timeline: who did what, when, and why. Append-only. */
@Entity('fertilizer_request_events')
@Index('idx_fert_events_request', ['requestId', 'at'])
export class FertilizerRequestEventEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_id' })
  @ForeignKey(() => FertilizerRequestEntity, {
    name: 'fertilizer_request_events_request_id_fkey',
  })
  requestId: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  at: Date;

  /** set when the agent's phone recorded it (offline sync keeps the device time) */
  @Column({ name: 'device_at', type: 'timestamptz', nullable: true })
  deviceAt: Date | null;

  @Column({ type: 'varchar', length: 100 })
  actor: string;

  @Column({ name: 'actor_role', type: 'varchar', length: 30 })
  actorRole: string;

  @Column({ type: 'varchar', length: 80 })
  action: string;

  @Column({ name: 'from_status', type: 'varchar', nullable: true, length: 30 })
  fromStatus: string | null;

  @Column({ name: 'to_status', type: 'varchar', nullable: true, length: 30 })
  toStatus: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;
}
