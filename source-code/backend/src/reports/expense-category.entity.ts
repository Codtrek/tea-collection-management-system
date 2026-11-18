import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * RPT-04 — the daily-expense category list (Finance-Reports-Addendum §6). Data, not code: the
 * Administrator adds, renames, reorders and deactivates categories in ADM-01 Factory Setup. An
 * inactive category can't be picked for a new entry but stays on the entries that used it.
 */
@Entity('expense_categories')
export class ExpenseCategoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 60, unique: true })
  name: string;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'updated_by', type: 'varchar', nullable: true, length: 100 })
  updatedBy: string | null;

  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
