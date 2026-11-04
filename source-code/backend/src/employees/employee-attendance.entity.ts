import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { DbAttendanceStatus } from './employee-map';

/** EMP-05..08 — one row per employee per day, upserted on re-marking. */
@Entity('employee_attendance')
export class EmployeeAttendanceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id' })
  employeeId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar' })
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

  @Column({ name: 'marked_by', type: 'varchar', nullable: true })
  markedBy: string | null;

  // ── Attendance-Leave-Addendum Phase 1 ──
  /** Half-day: which half was worked */
  @Column({ type: 'varchar', nullable: true })
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

  @Column({ type: 'varchar', default: 'portal' })
  source: 'portal' | 'dispatch' | 'app' | 'leave' | 'holiday';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
