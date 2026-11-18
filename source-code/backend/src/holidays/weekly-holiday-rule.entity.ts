import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { EmployeeCategory } from './working-days';

/** The weekly holiday for a category, from `effectiveFrom` on — a change adds a row, past weeks keep theirs. */
@Entity('weekly_holiday_rules')
@Check(
  'weekly_holiday_rules_category_check',
  `((category)::text = ANY ((ARRAY['factory'::character varying, 'office'::character varying])::text[]))`,
)
@Check(
  'weekly_holiday_rules_half_day_weekday_check',
  `((half_day_weekday >= 0) AND (half_day_weekday <= 6))`,
)
export class WeeklyHolidayRuleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  category: EmployeeCategory;

  /** 0 = Sunday … 6 = Saturday */
  @Column({ type: 'int', array: true })
  weekdays: number[];

  @Column({ name: 'half_day_weekday', type: 'int', nullable: true })
  halfDayWeekday: number | null;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  @Column({ name: 'created_by', type: 'varchar', nullable: true, length: 100 })
  createdBy: string | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: true })
  createdAt: Date;
}
