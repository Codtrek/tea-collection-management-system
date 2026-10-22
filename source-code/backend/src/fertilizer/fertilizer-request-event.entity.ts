import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** The request's timeline: who did what, when, and why. Append-only. */
@Entity('fertilizer_request_events')
export class FertilizerRequestEventEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_id' })
  requestId: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  at: Date;

  /** set when the agent's phone recorded it (offline sync keeps the device time) */
  @Column({ name: 'device_at', type: 'timestamptz', nullable: true })
  deviceAt: Date | null;

  @Column({ type: 'varchar' })
  actor: string;

  @Column({ name: 'actor_role', type: 'varchar' })
  actorRole: string;

  @Column({ type: 'varchar' })
  action: string;

  @Column({ name: 'from_status', type: 'varchar', nullable: true })
  fromStatus: string | null;

  @Column({ name: 'to_status', type: 'varchar', nullable: true })
  toStatus: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;
}
