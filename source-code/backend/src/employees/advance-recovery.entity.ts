import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * One month's recovery of a salary advance (or one cash repayment) — Salary-Advances-Addendum
 * §9. A payroll month's row is `reserved` at Generate and `recovered` at Process; `planned` is
 * what the month meant to deduct, `amount` what the gross allowed (the rest is carried forward).
 */
@Entity('advance_recoveries')
export class AdvanceRecoveryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'advance_id' })
  advanceId: string;

  @Column({ type: 'varchar', default: 'payroll' })
  kind: 'payroll' | 'cash';

  /** payroll month ('August 2026'); null for a cash repayment */
  @Column({ type: 'varchar', nullable: true })
  period: string | null;

  @Column({ name: 'payroll_run_id', type: 'varchar', nullable: true })
  payrollRunId: string | null;

  @Column({ type: 'varchar', default: 'reserved' })
  status: 'reserved' | 'recovered';

  @Column({ name: 'planned_amount', type: 'decimal', precision: 12, scale: 2 })
  plannedAmount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', nullable: true })
  reference: string | null;

  @Column({ name: 'paid_on', type: 'date', nullable: true })
  paidOn: string | null;

  @Column({ name: 'recorded_by', type: 'varchar', nullable: true })
  recordedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
