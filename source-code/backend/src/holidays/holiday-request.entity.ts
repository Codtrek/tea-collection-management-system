import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
export class HolidayRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  kind: HolidayRequestKind;

  @Column({ type: 'varchar', default: 'pending' })
  status: HolidayRequestStatus;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ name: 'date_from', type: 'date' })
  dateFrom: string;

  @Column({ name: 'date_to', type: 'date' })
  dateTo: string;

  @Column({ name: 'requested_by', type: 'varchar' })
  requestedBy: string;

  @Column({ name: 'requested_by_user_id', type: 'int', nullable: true })
  requestedByUserId: number | null;

  @Column({ name: 'requested_at', type: 'timestamptz' })
  requestedAt: Date;

  @Column({ name: 'decided_by', type: 'varchar', nullable: true })
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
