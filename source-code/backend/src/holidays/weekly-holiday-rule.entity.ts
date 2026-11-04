import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { EmployeeCategory } from './working-days';

/** The weekly holiday for a category, from `effectiveFrom` on — a change adds a row, past weeks keep theirs. */
@Entity('weekly_holiday_rules')
export class WeeklyHolidayRuleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  category: EmployeeCategory;

  /** 0 = Sunday … 6 = Saturday */
  @Column({ type: 'int', array: true })
  weekdays: number[];

  @Column({ name: 'half_day_weekday', type: 'int', nullable: true })
  halfDayWeekday: number | null;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
