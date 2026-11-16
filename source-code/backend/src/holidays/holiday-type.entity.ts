import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

/** Paid / work-allowed defaults per holiday type — the Factory Manager sets them. */
@Entity('holiday_types')
@Check(
  'holiday_types_type_check',
  `((type)::text = ANY ((ARRAY['poya'::character varying, 'public'::character varying, 'weekly'::character varying, 'closure'::character varying])::text[]))`,
)
export class HolidayTypeEntity {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  type: 'poya' | 'public' | 'weekly' | 'closure';

  @Column({ type: 'varchar', length: 40 })
  label: string;

  @Column({ type: 'boolean' })
  paid: boolean;

  @Column({ name: 'work_allowed', type: 'boolean' })
  workAllowed: boolean;

  @Column({ name: 'updated_by', type: 'varchar', nullable: true, length: 100 })
  updatedBy: string | null;

  @Column({
    name: 'updated_at',
    type: 'timestamptz',
    nullable: true,
    default: () => 'now()',
  })
  updatedAt: Date | null;
}
