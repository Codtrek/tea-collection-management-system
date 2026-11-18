import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import type { EmployeeCategory, HolidayKind } from './working-days';

export type HolidaySource = 'manual' | 'google' | 'file';

/** A dated holiday — Poya / public (entered per year) or a declared closure (Attendance-Leave-Addendum). */
@Entity('holidays')
@Check(
  'holidays_applies_to_check',
  `((applies_to)::text = ANY ((ARRAY['all'::character varying, 'factory'::character varying, 'office'::character varying])::text[]))`,
)
@Check(
  'holidays_source_check',
  `((source)::text = ANY ((ARRAY['manual'::character varying, 'google'::character varying, 'file'::character varying])::text[]))`,
)
@Check(
  'holidays_type_check',
  `((type)::text = ANY ((ARRAY['poya'::character varying, 'public'::character varying, 'closure'::character varying])::text[]))`,
)
@Index('idx_holidays_date', ['date'])
@Index('idx_holidays_external_uid', ['externalUid'])
export class HolidayEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 10 })
  type: HolidayKind;

  /** null = the type's default */
  @Column({ type: 'boolean', nullable: true })
  paid: boolean | null;

  @Column({ name: 'work_allowed', type: 'boolean', nullable: true })
  workAllowed: boolean | null;

  @Column({ name: 'applies_to', type: 'varchar', default: 'all', length: 10 })
  appliesTo: 'all' | EmployeeCategory;

  @Column({ name: 'collection_stops', type: 'boolean', default: false })
  collectionStops: boolean;

  @Column({ name: 'declare_group', type: 'uuid', nullable: true })
  declareGroup: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'created_by', type: 'varchar', nullable: true, length: 100 })
  createdBy: string | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: true })
  createdAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({
    name: 'cancelled_by',
    type: 'varchar',
    nullable: true,
    length: 100,
  })
  cancelledBy: string | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string | null;

  /** a Manager may change only the holidays they created */
  @Column({ name: 'created_by_user_id', type: 'int', nullable: true })
  @ForeignKey(() => User, { name: 'holidays_created_by_user_id_fkey' })
  createdByUserId: number | null;

  @Column({ type: 'varchar', default: 'manual', length: 10 })
  source: HolidaySource;

  /** the iCal UID of an imported holiday — what a re-sync matches on */
  @Column({
    name: 'external_uid',
    type: 'varchar',
    nullable: true,
    length: 200,
  })
  externalUid: string | null;

  @Column({ name: 'imported_at', type: 'timestamptz', nullable: true })
  importedAt: Date | null;
}
