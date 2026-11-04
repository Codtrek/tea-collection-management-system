import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Paid / work-allowed defaults per holiday type — the Factory Manager sets them. */
@Entity('holiday_types')
export class HolidayTypeEntity {
  @PrimaryColumn({ type: 'varchar' })
  type: 'poya' | 'public' | 'weekly' | 'closure';

  @Column({ type: 'varchar' })
  label: string;

  @Column({ type: 'boolean' })
  paid: boolean;

  @Column({ name: 'work_allowed', type: 'boolean' })
  workAllowed: boolean;

  @Column({ name: 'updated_by', type: 'varchar', nullable: true })
  updatedBy: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null;
}
