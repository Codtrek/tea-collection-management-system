import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PayrollRunEntity } from './payroll-run.entity';
import { SalaryAdvanceEntity } from './salary-advance.entity';

/**
 * One month's recovery of a salary advance (or one cash repayment) — Salary-Advances-Addendum
 * §9. A payroll month's row is `reserved` at Generate and `recovered` at Process; `planned` is
 * what the month meant to deduct, `amount` what the gross allowed (the rest is carried forward).
 */
@Entity('advance_recoveries')
@Check('advance_recoveries_amount_check', `(amount >= (0)::numeric)`)
@Check(
  'advance_recoveries_kind_check',
  `((kind)::text = ANY ((ARRAY['payroll'::character varying, 'cash'::character varying])::text[]))`,
)
@Check(
  'advance_recoveries_status_check',
  `((status)::text = ANY ((ARRAY['reserved'::character varying, 'recovered'::character varying])::text[]))`,
)
@Index('idx_advance_recoveries_advance', ['advanceId'])
@Index('uq_advance_recoveries_month', ['advanceId', 'period'], {
  unique: true,
  where: `((kind)::text = 'payroll'::text)`,
})
export class AdvanceRecoveryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'advance_id', type: 'varchar', length: 20 })
  @ForeignKey(() => SalaryAdvanceEntity, {
    name: 'advance_recoveries_advance_id_fkey',
    onDelete: 'CASCADE',
  })
  advanceId: string;

  @Column({ type: 'varchar', default: 'payroll', length: 10 })
  kind: 'payroll' | 'cash';

  /** payroll month ('August 2026'); null for a cash repayment */
  @Column({ type: 'varchar', nullable: true, length: 30 })
  period: string | null;

  @Column({
    name: 'payroll_run_id',
    type: 'varchar',
    nullable: true,
    length: 20,
  })
  @ForeignKey(() => PayrollRunEntity, {
    name: 'advance_recoveries_payroll_run_id_fkey',
    onDelete: 'SET NULL',
  })
  payrollRunId: string | null;

  @Column({ type: 'varchar', default: 'reserved', length: 10 })
  status: 'reserved' | 'recovered';

  @Column({
    name: 'planned_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  plannedAmount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: string;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  reference: string | null;

  @Column({ name: 'paid_on', type: 'date', nullable: true })
  paidOn: string | null;

  @Column({ name: 'recorded_by', type: 'varchar', nullable: true, length: 100 })
  recordedBy: string | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
