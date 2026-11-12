import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * RPT-04 — one receipt (photo or PDF, at most 2 MB) per daily expense entry, stored in the
 * database until file storage (Cloudinary) lands. Read only through
 * `GET /reports/expenses/:id/receipt`; never sent with the entry itself.
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
