import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

/**
 * RPT-04 — one row per daily operating expense (Finance-Reports-Addendum §6–7): firewood,
 * electricity, vehicle fuel… Leaf purchases, wages and fertilizer stock are DERIVED by
 * FinanceService at query time and never stored here.
 */
@Entity('expense_entries')
@Index('idx_expense_entries_date', ['entryDate'])
export class ExpenseEntryEntity {
  /** Business key, e.g. 'EXP-2026-0137' — from `expense_entry_seq`. */
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id: string;

  @Column({ name: 'category_id', type: 'int' })
  categoryId: number;

  @Column({ type: 'varchar', length: 200 })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'entry_date', type: 'date' })
  entryDate: string;

  /** null on entries made before 2026-11-15 */
  @Column({ name: 'paid_via', type: 'varchar', nullable: true })
  paidVia: 'cash' | 'bank' | null;

  @Column({ name: 'entered_by', type: 'varchar', length: 100 })
  enteredBy: string;

  /** the creator — who may change the entry within the edit window; null on old entries */
  @Column({ name: 'created_by_user_id', type: 'int', nullable: true })
  createdByUserId: number | null;

  @Column({ name: 'updated_by', type: 'varchar', nullable: true })
  updatedBy: string | null;

  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date | null;

  /** the reason given for the latest change made outside the creator's window */
  @Column({ name: 'edit_reason', type: 'text', nullable: true })
  editReason: string | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
