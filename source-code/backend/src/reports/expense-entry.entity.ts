import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import type { ExpenseCategory } from './reports-map';

/**
 * RPT-04 — one row per manual daily operational expense (utilities,
 * maintenance, misc). The Payroll/Fertilizer/Transport lines RPT-03 also
 * aggregates are DERIVED from `payroll_runs`/`settlements` at query time and
 * never stored here.
 */
@Entity('expense_entries')
export class ExpenseEntryEntity {
  /** Business key, e.g. 'EXP-2026-0001' — not a generated id. */
  @PrimaryColumn()
  id: string;

  @Column({ type: 'varchar' })
  category: ExpenseCategory;

  @Column()
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'entry_date', type: 'date' })
  entryDate: string;

  @Column({ name: 'entered_by' })
  enteredBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
