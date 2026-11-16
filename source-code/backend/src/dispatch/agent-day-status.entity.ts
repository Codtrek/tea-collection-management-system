import { Check, Column, Entity, ForeignKey, PrimaryColumn } from 'typeorm';
import { CollectionAgentEntity } from './collection-agent.entity';

export type DayStatus = 'AVAILABLE' | 'ABSENT';

/** One row per agent per day: availability plus when the shift started/ended. */
@Entity('agent_day_status')
@Check('agent_day_status_source_check', `"source" IN ('self', 'officer')`)
@Check('agent_day_status_status_check', `"status" IN ('AVAILABLE', 'ABSENT')`)
export class AgentDayStatusEntity {
  @PrimaryColumn({ name: 'agent_id', type: 'int' })
  @ForeignKey(() => CollectionAgentEntity, {
    name: 'agent_day_status_agent_id_fkey',
  })
  agentId: number;

  /** 'YYYY-MM-DD' */
  @PrimaryColumn({ type: 'date' })
  day: string;

  @Column({ type: 'varchar', length: 10, default: 'AVAILABLE' })
  status: DayStatus;

  @Column({ type: 'varchar', length: 10, nullable: true })
  source: 'self' | 'officer' | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'marked_by', type: 'varchar', length: 100, nullable: true })
  markedBy: string | null;

  @Column({ name: 'shift_started_at', type: 'timestamptz', nullable: true })
  shiftStartedAt: Date | null;

  @Column({ name: 'shift_ended_at', type: 'timestamptz', nullable: true })
  shiftEndedAt: Date | null;
}
