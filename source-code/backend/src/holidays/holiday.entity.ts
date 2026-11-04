import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { EmployeeCategory, HolidayKind } from './working-days';

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
}
