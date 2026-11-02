import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * A request to change an estate advance's plan — a new installment and / or start period
 * (Estate-Owner-Advances-Addendum §4, same shape as salary advances' advance_reschedules).
 * Approved by someone other than the requester, audited. Processed settlement periods are
 * recovery rows, so a reschedule never changes them.
 */
@Entity('estate_advance_reschedules')
export class EstateAdvanceRescheduleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'advance_id' })
  advanceId: string;

  @Column({
    name: 'installment_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  installmentAmount: string;

  @Column({ name: 'start_period' })
  startPeriod: string;

  @Column({ type: 'text' })
  note: string;

  @Column({ type: 'varchar', default: 'Pending' })
  status: 'Pending' | 'Approved' | 'Rejected';

  @Column({ name: 'requested_by_user_id', type: 'int', nullable: true })
  requestedByUserId: number | null;

  @Column({ name: 'requested_by_name', type: 'varchar', nullable: true })
  requestedByName: string | null;

  @Column({ name: 'decided_by', type: 'varchar', nullable: true })
  decidedBy: string | null;

  @Column({ name: 'decided_on', type: 'timestamp', nullable: true })
  decidedOn: Date | null;

  @Column({ name: 'decision_reason', type: 'text', nullable: true })
  decisionReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
