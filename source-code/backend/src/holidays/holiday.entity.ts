import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { EmployeeCategory, HolidayKind } from './working-days';

export type HolidaySource = 'manual' | 'google' | 'file';

/** A dated holiday — Poya / public (entered per year) or a declared closure (Attendance-Leave-Addendum). */
@Entity('holidays')
export class HolidayEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  type: HolidayKind;

  /** null = the type's default */
  @Column({ type: 'boolean', nullable: true })
  paid: boolean | null;

  @Column({ name: 'work_allowed', type: 'boolean', nullable: true })
  workAllowed: boolean | null;

  @Column({ name: 'applies_to', type: 'varchar', default: 'all' })
  appliesTo: 'all' | EmployeeCategory;

  @Column({ name: 'collection_stops', type: 'boolean', default: false })
  collectionStops: boolean;

  @Column({ name: 'declare_group', type: 'uuid', nullable: true })
  declareGroup: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancelled_by', type: 'varchar', nullable: true })
  cancelledBy: string | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string | null;

  /** a Manager may change only the holidays they created */
  @Column({ name: 'created_by_user_id', type: 'int', nullable: true })
  createdByUserId: number | null;

  @Column({ type: 'varchar', default: 'manual' })
  source: HolidaySource;

  /** the iCal UID of an imported holiday — what a re-sync matches on */
  @Column({ name: 'external_uid', type: 'varchar', nullable: true })
  externalUid: string | null;

  @Column({ name: 'imported_at', type: 'timestamptz', nullable: true })
  importedAt: Date | null;
}
