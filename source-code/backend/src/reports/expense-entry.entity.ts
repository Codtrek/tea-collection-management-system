import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import type { ExpenseCategory } from './reports-map';

/**
 * RPT-04 — one row per manual daily operational expense (utilities,
 * maintenance, misc). The Payroll/Fertilizer/Transport lines RPT-03 also
 * aggregates are DERIVED from `payroll_runs`/`settlements` at query time and
 * never stored here.
 */
@Entity('expense_entries')
@Check(
  'expense_entries_category_check',
  `"category" IN ('Utilities', 'Maintenance', 'Miscellaneous', 'Other')`,
)
@Index('idx_expense_entries_date', ['entryDate'])
export class ExpenseEntryEntity {
  /** Business key, e.g. 'EXP-2026-0001' — not a generated id. */
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id: string;

  @Column({ type: 'varchar', length: 20 })
  category: ExpenseCategory;

  @Column({ type: 'varchar', length: 200 })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'entry_date', type: 'date' })
  entryDate: string;

  @Column({ name: 'entered_by', type: 'varchar', length: 100 })
  enteredBy: string;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
