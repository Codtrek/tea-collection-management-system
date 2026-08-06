import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Location history (shift-only). `recordedAt` is the DEVICE clock — when the fix was
 * taken — so a batch uploaded after an offline stretch keeps its true times.
 * Retention: rows older than 30 days are deleted nightly (DispatchTasks).
 */
@Entity('agent_location_pings')
export class AgentLocationPingEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'agent_id' })
  agentId: number;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;

  @Column({ name: 'received_at', type: 'timestamptz' })
  receivedAt: Date;

  @Column({ type: 'decimal', precision: 9, scale: 6 })
  lat: string;

  @Column({ type: 'decimal', precision: 9, scale: 6 })
  lng: string;

  @Column({
    name: 'accuracy_m',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  accuracyM: string | null;

  @Column({ type: 'varchar' })
  source: 'ping' | 'checkin';
}
