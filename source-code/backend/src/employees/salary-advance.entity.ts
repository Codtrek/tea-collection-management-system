import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { EmployeeEntity } from './employee.entity';
import type { DbAdvanceStatus } from './employee-map';

/**
 * EMP-09/10 — employee-requested advance. `deducted` tracks whether an
 * Approved advance has already been applied to a processed payroll run,
 * kept separate from the approval-workflow `status`.
 */
@Entity('salary_advances')
@Check(
  'salary_advances_status_check',
  `"status" IN ('Pending', 'Approved', 'Rejected')`,
)
@Index('idx_salary_advances_employee', ['employeeId'])
export class SalaryAdvanceEntity {
  /** Business key, e.g. 'EMP-ADV-0231' — not a generated id. */
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id: string;

  @Column({ name: 'employee_id', type: 'int' })
  @ForeignKey(() => EmployeeEntity, {
    name: 'salary_advances_employee_id_fkey',
  })
  employeeId: number;

  @Column({ name: 'employee_name', type: 'varchar', length: 100 })
  employeeName: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'date_requested', type: 'date' })
  dateRequested: string;

  @Column({ type: 'varchar', length: 20, default: 'Pending' })
  status: DbAdvanceStatus;

  @Column({ default: false })
  deducted: boolean;

  @Column({ name: 'decided_by', type: 'varchar', length: 100, nullable: true })
  decidedBy: string | null;

  @Column({ name: 'decided_on', type: 'timestamp', nullable: true })
  decidedOn: Date | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
