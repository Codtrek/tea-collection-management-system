import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** An imported event the Administrator unticked — a re-sync doesn't offer it again (Attendance-Leave-Addendum §4.5). */
@Entity('holiday_import_skips')
export class HolidayImportSkipEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  uid: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'skipped_by', type: 'varchar', nullable: true })
  skippedBy: string | null;

  @Column({ name: 'skipped_at', type: 'timestamptz' })
  skippedAt: Date;
}
