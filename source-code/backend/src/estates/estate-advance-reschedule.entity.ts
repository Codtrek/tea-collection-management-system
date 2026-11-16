import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstateAdvanceEntity } from './estate-advance.entity';
import { User } from '../users/user.entity';

/**
 * A request to change an estate advance's plan — a new installment and / or start period
 * (Estate-Owner-Advances-Addendum §4, same shape as salary advances' advance_reschedules).
 * Approved by someone other than the requester, audited. Processed settlement periods are
 * recovery rows, so a reschedule never changes them.
 */
@Entity('estate_advance_reschedules')
@Check(
  'estate_advance_reschedules_installment_amount_check',
  `(installment_amount > (0)::numeric)`,
)
@Check(
  'estate_advance_reschedules_status_check',
  `((status)::text = ANY ((ARRAY['Pending'::character varying, 'Approved'::character varying, 'Rejected'::character varying])::text[]))`,
)
@Index('idx_estate_advance_reschedules_advance', ['advanceId'])
export class EstateAdvanceRescheduleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'advance_id', type: 'varchar', length: 20 })
  @ForeignKey(() => EstateAdvanceEntity, {
    name: 'estate_advance_reschedules_advance_id_fkey',
    onDelete: 'CASCADE',
  })
  advanceId: string;

  @Column({
    name: 'installment_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  installmentAmount: string;

  @Column({ name: 'start_period', type: 'varchar', length: 30 })
  startPeriod: string;

  @Column({ type: 'text' })
  note: string;

  @Column({ type: 'varchar', default: 'Pending', length: 10 })
  status: 'Pending' | 'Approved' | 'Rejected';

  @Column({ name: 'requested_by_user_id', type: 'int', nullable: true })
  @ForeignKey(() => User, {
    name: 'estate_advance_reschedules_requested_by_user_id_fkey',
  })
  requestedByUserId: number | null;

  @Column({
    name: 'requested_by_name',
    type: 'varchar',
    nullable: true,
    length: 100,
  })
  requestedByName: string | null;

  @Column({ name: 'decided_by', type: 'varchar', nullable: true, length: 100 })
  decidedBy: string | null;

  @Column({ name: 'decided_on', type: 'timestamp', nullable: true })
  decidedOn: Date | null;

  @Column({ name: 'decision_reason', type: 'text', nullable: true })
  decisionReason: string | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
