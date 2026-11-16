import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EmployeeEntity } from './employee.entity';
import type { DbAttendanceStatus } from './employee-map';

/** EMP-05..08 — one row per employee per day, upserted on re-marking. */
@Entity('employee_attendance')
@Check(
  'employee_attendance_status_check',
  `"status" IN ('Present', 'Absent', 'Leave', 'Half-day')`,
)
@Unique('employee_attendance_employee_id_date_key', ['employeeId', 'date'])
@Index('idx_employee_attendance_date', ['date'])
@Index('idx_employee_attendance_employee', ['employeeId'])
export class EmployeeAttendanceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id', type: 'int' })
  @ForeignKey(() => EmployeeEntity, {
    name: 'employee_attendance_employee_id_fkey',
  })
  employeeId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 20 })
  status: DbAttendanceStatus;

  @Column({
    name: 'day_hours',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  dayHours: string;

  @Column({
    name: 'day_ot_hours',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  dayOtHours: string;

  @Column({
    name: 'night_hours',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  nightHours: string;

  @Column({
    name: 'night_ot_hours',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  nightOtHours: string;

  @Column({ name: 'marked_by', type: 'varchar', length: 100, nullable: true })
  markedBy: string | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
