import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { EmployeeEntity } from './employee.entity';
import type { DbPayrollStatus } from './employee-map';

/**
 * EMP-11..13 — one row per employee per period. `dayHours`..`nightOtRate`
 * are snapshots captured at `generatePayroll` time (attendance aggregate ×
 * the employee's rates *then*), so a later rate change never retroactively
 * alters a past run — same principle as effective-dated grade rates. NO
 * per-transaction bank charge is deducted (same resolved rule as Estates
 * settlements — see Claude.md's Payment calculation section).
 */
@Entity('payroll_runs')
@Check('payroll_runs_status_check', `"status" IN ('Pending', 'Processed')`)
@Unique('payroll_runs_employee_id_period_key', ['employeeId', 'period'])
@Index('idx_payroll_runs_employee', ['employeeId'])
@Index('idx_payroll_runs_status', ['status'])
export class PayrollRunEntity {
  /** Business key, e.g. 'PR-0001' — not a generated id. */
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id: string;

  @Column({ name: 'employee_id', type: 'int' })
  @ForeignKey(() => EmployeeEntity, { name: 'payroll_runs_employee_id_fkey' })
  employeeId: number;

  @Column({ name: 'employee_name', type: 'varchar', length: 100 })
  employeeName: string;

  @Column({ type: 'varchar', length: 20 })
  period: string;

  @Column({
    name: 'day_hours',
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: 0,
  })
  dayHours: string;

  @Column({
    name: 'day_ot_hours',
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: 0,
  })
  dayOtHours: string;

  @Column({
    name: 'night_hours',
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: 0,
  })
  nightHours: string;

  @Column({
    name: 'night_ot_hours',
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: 0,
  })
  nightOtHours: string;

  @Column({
    name: 'day_rate',
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 0,
  })
  dayRate: string;

  @Column({
    name: 'day_ot_rate',
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 0,
  })
  dayOtRate: string;

  @Column({
    name: 'night_rate',
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 0,
  })
  nightRate: string;

  @Column({
    name: 'night_ot_rate',
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 0,
  })
  nightOtRate: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  gross: string;

  @Column({
    name: 'deductions_advances',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  deductionsAdvances: string;

  @Column({
    name: 'deductions_other',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  deductionsOther: string;

  @Column({ type: 'varchar', length: 20, default: 'Pending' })
  status: DbPayrollStatus;

  @Column({ name: 'missing_bank', default: false })
  missingBank: boolean;

  @Column({
    name: 'processed_by',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  processedBy: string | null;

  @Column({ name: 'processed_on', type: 'timestamp', nullable: true })
  processedOn: Date | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
