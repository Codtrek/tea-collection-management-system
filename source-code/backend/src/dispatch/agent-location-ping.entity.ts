import {
  Check,
  Column,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CollectionAgentEntity } from './collection-agent.entity';

/**
 * Location history (shift-only). `recordedAt` is the DEVICE clock — when the fix was
 * taken — so a batch uploaded after an offline stretch keeps its true times.
 * Retention: rows older than 30 days are deleted nightly (DispatchTasks).
 */
@Entity('agent_location_pings')
@Check('agent_location_pings_lat_check', `"lat" >= -90 AND "lat" <= 90`)
@Check('agent_location_pings_lng_check', `"lng" >= -180 AND "lng" <= 180`)
@Check('agent_location_pings_source_check', `"source" IN ('ping', 'checkin')`)
@Index('idx_pings_agent_time', ['agentId', 'recordedAt'])
@Index('idx_pings_recorded', ['recordedAt'])
export class AgentLocationPingEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'agent_id', type: 'int' })
  @ForeignKey(() => CollectionAgentEntity, {
    name: 'agent_location_pings_agent_id_fkey',
  })
  agentId: number;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;

  @Column({ name: 'received_at', type: 'timestamptz', default: () => 'now()' })
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

  @Column({ type: 'varchar', length: 10, default: 'ping' })
  source: 'ping' | 'checkin';
}
