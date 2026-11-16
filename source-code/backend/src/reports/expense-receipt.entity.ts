import { Check, Column, Entity, ForeignKey, PrimaryColumn } from 'typeorm';
import { ExpenseEntryEntity } from './expense-entry.entity';

/**
 * RPT-04 — the `expense_receipts` table, kept EMPTY and unused (decided 2026-11-16: no file
 * storage in the database). Receipts wait for the shared file-storage (Cloudinary) task, which
 * will decide whether this table holds a file reference or is dropped. Nothing reads or writes it.
 */
@Entity('expense_receipts')
@Check(
  'expense_receipts_size_bytes_check',
  `((size_bytes > 0) AND (size_bytes <= 2097152))`,
)
export class ExpenseReceiptEntity {
  @PrimaryColumn({ name: 'entry_id', type: 'varchar', length: 20 })
  @ForeignKey(() => ExpenseEntryEntity, {
    name: 'expense_receipts_entry_id_fkey',
    onDelete: 'CASCADE',
  })
  entryId: string;

  @Column({ name: 'file_name', type: 'varchar', length: 200 })
  fileName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'int' })
  sizeBytes: number;

  @Column({ type: 'bytea' })
  data: Buffer;

  @Column({ name: 'uploaded_by', type: 'varchar', length: 100 })
  uploadedBy: string;

  @Column({ name: 'uploaded_at', type: 'timestamp', default: () => 'now()' })
  uploadedAt: Date;
}
