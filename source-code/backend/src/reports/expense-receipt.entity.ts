import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * RPT-04 — the `expense_receipts` table, kept EMPTY and unused (decided 2026-11-16: no file
 * storage in the database). Receipts wait for the shared file-storage (Cloudinary) task, which
 * will decide whether this table holds a file reference or is dropped. Nothing reads or writes it.
 */
@Entity('expense_receipts')
export class ExpenseReceiptEntity {
  @PrimaryColumn({ name: 'entry_id', type: 'varchar' })
  entryId: string;

  @Column({ name: 'file_name', type: 'varchar' })
  fileName: string;

  @Column({ name: 'mime_type', type: 'varchar' })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'int' })
  sizeBytes: number;

  @Column({ type: 'bytea' })
  data: Buffer;

  @Column({ name: 'uploaded_by', type: 'varchar' })
  uploadedBy: string;

  @Column({ name: 'uploaded_at', type: 'timestamp' })
  uploadedAt: Date;
}
