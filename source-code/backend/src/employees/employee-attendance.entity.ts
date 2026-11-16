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
@Check(
  'employee_attendance_half_check',
  `((half IS NULL) OR ((half)::text = ANY ((ARRAY['AM'::character varying, 'PM'::character varying])::text[])))`,
)
@Check(
  'employee_attendance_source_check',
  `((source)::text = ANY ((ARRAY['portal'::character varying, 'dispatch'::character varying, 'app'::character varying, 'leave'::character varying, 'holiday'::character varying])::text[]))`,
)
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

  // ── Attendance-Leave-Addendum Phase 1 ──
  /** Half-day: which half was worked */
  @Column({ type: 'varchar', nullable: true, length: 2 })
  half: 'AM' | 'PM' | null;

  /** Short leave: 'HH:MM' out and back */
  @Column({ name: 'short_out', type: 'time', nullable: true })
  shortOut: string | null;

  @Column({ name: 'short_back', type: 'time', nullable: true })
  shortBack: string | null;

  /** worked on a non-working day — flagged for payroll */
  @Column({ name: 'holiday_worked', type: 'boolean', default: false })
  holidayWorked: boolean;

  /** the approved leave request that filled (and locks) this day — Phase 2 */
  @Column({ name: 'leave_request_id', type: 'int', nullable: true })
  leaveRequestId: number | null;

  @Column({ name: 'marked_at', type: 'timestamptz', nullable: true })
  markedAt: Date | null;

  /** why an older day was edited (Manager) */
  @Column({ name: 'edit_reason', type: 'text', nullable: true })
  editReason: string | null;

  @Column({ type: 'varchar', default: 'portal', length: 10 })
  source: 'portal' | 'dispatch' | 'app' | 'leave' | 'holiday';

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
