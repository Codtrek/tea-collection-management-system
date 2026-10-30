import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import type { DbAdvanceStatus } from './estate-map';

/** EST-05/06 — money issued ahead of settlement, deducted at the next processed run. */
@Entity('estate_advances')
export class EstateAdvanceEntity {
  /** Business key, e.g. 'EADV-2026-0031' — not a generated id. */
  @PrimaryColumn()
  id: string;

  @Column({ name: 'estate_id' })
  estateId: number;

  @Column({ name: 'estate_name' })
  estateName: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'date_issued', type: 'date' })
  dateIssued: string;

  @Column({ name: 'issued_by' })
  issuedBy: string;

  @Column({ type: 'varchar' })
  status: DbAdvanceStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
