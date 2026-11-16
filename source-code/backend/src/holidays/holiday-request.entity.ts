import {
  Check,
  Column,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type HolidayRequestKind = 'weekly_rule' | 'closure' | 'emergency';
export type HolidayRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'kept'
  | 'reverted';

/** An attendance row as it was before an emergency closure touched it (for revert). */
export interface AttendanceSnapshot {
  id: number;
  employeeId: number;
  date: string;
  status: string;
  holidayWorked: boolean;
  editReason: string | null;
  [k: string]: unknown;
}

/**
 * A holiday change waiting for the Administrator (Attendance-Leave-Addendum §4.2): a Manager's
 * weekly-holiday proposal or factory-wide closure request (no effect until approved), or an
 * emergency closure that already took effect and waits for review (keep or revert).
 */
@Entity('holiday_requests')
@Check(
  'holiday_requests_kind_check',
  `((kind)::text = ANY ((ARRAY['weekly_rule'::character varying, 'closure'::character varying, 'emergency'::character varying])::text[]))`,
)
@Check(
  'holiday_requests_status_check',
  `((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'kept'::character varying, 'reverted'::character varying])::text[]))`,
)
@Index('idx_holiday_requests_status', ['status'])
export class HolidayRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 12 })
  kind: HolidayRequestKind;

  @Column({ type: 'varchar', default: 'pending', length: 10 })
  status: HolidayRequestStatus;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ name: 'date_from', type: 'date' })
  dateFrom: string;

  @Column({ name: 'date_to', type: 'date' })
  dateTo: string;

  @Column({ name: 'requested_by', type: 'varchar', length: 100 })
  requestedBy: string;

  @Column({ name: 'requested_by_user_id', type: 'int', nullable: true })
  @ForeignKey(() => User, {
    name: 'holiday_requests_requested_by_user_id_fkey',
  })
  requestedByUserId: number | null;

  @Column({ name: 'requested_at', type: 'timestamptz', default: () => 'now()' })
  requestedAt: Date;

  @Column({ name: 'decided_by', type: 'varchar', nullable: true, length: 100 })
  decidedBy: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({ name: 'decision_reason', type: 'text', nullable: true })
  decisionReason: string | null;

  @Column({ name: 'declare_group', type: 'uuid', nullable: true })
  declareGroup: string | null;

  @Column({ type: 'jsonb', nullable: true })
  snapshot: AttendanceSnapshot[] | null;
}
