import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** An imported event the Administrator unticked — a re-sync doesn't offer it again (Attendance-Leave-Addendum §4.5). */
@Entity('holiday_import_skips')
@Index('idx_holiday_import_skips_year', ['year'])
export class HolidayImportSkipEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true, length: 200 })
  uid: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'skipped_by', type: 'varchar', nullable: true, length: 100 })
  skippedBy: string | null;

  @Column({ name: 'skipped_at', type: 'timestamptz', default: () => 'now()' })
  skippedAt: Date;
}
