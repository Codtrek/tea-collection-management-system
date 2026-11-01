import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import type { DbAdvanceStatus } from './employee-map';

/**
 * EMP-09/10 — employee-requested advance. `deducted` tracks whether an
 * Approved advance has already been applied to a processed payroll run,
 * kept separate from the approval-workflow `status`.
 */
@Entity('salary_advances')
export class SalaryAdvanceEntity {
  /** Business key, e.g. 'EMP-ADV-0231' — not a generated id. */
  @PrimaryColumn()
  id: string;

  @Column({ name: 'employee_id' })
  employeeId: number;

  @Column({ name: 'employee_name' })
  employeeName: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'date_requested', type: 'date' })
  dateRequested: string;

  @Column({ type: 'varchar' })
  status: DbAdvanceStatus;

  @Column({ default: false })
  deducted: boolean;

  @Column({ name: 'decided_by', type: 'varchar', nullable: true })
  decidedBy: string | null;

  @Column({ name: 'decided_on', type: 'timestamp', nullable: true })
  decidedOn: Date | null;

  /** the reason given with the decision — required to reject (Salary-Advances-Addendum) */
  @Column({ name: 'decision_reason', type: 'text', nullable: true })
  decisionReason: string | null;

  /** the payroll month whose row deducts it — reserved at Generate so it's counted once */
  @Column({ name: 'payroll_period', type: 'varchar', nullable: true })
  payrollPeriod: string | null;

  /** the payroll month it was recovered in — stamped at Process */
  @Column({ name: 'recovered_period', type: 'varchar', nullable: true })
  recoveredPeriod: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
