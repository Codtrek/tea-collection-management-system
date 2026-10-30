import { Column, Entity, PrimaryColumn } from 'typeorm';

export type DayStatus = 'AVAILABLE' | 'ABSENT';

/** One row per agent per day: availability plus when the shift started/ended. */
@Entity('agent_day_status')
export class AgentDayStatusEntity {
  @PrimaryColumn({ name: 'agent_id' })
  agentId: number;

  /** 'YYYY-MM-DD' */
  @PrimaryColumn({ type: 'date' })
  day: string;

  @Column({ type: 'varchar' })
  status: DayStatus;

  @Column({ type: 'varchar', nullable: true })
  source: 'self' | 'officer' | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'marked_by', type: 'varchar', nullable: true })
  markedBy: string | null;

  @Column({ name: 'shift_started_at', type: 'timestamptz', nullable: true })
  shiftStartedAt: Date | null;

  @Column({ name: 'shift_ended_at', type: 'timestamptz', nullable: true })
  shiftEndedAt: Date | null;
}
