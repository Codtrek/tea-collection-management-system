import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import type { DbAdvanceStatus } from './estate-map';

/** EST-05/06 — money issued ahead of settlement, deducted by settlements per its repayment plan. */
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

  /** Repayment plan (Estate-Owner-Advances-Addendum §4) — one installment a settlement period. */
  @Column({
    name: 'installment_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  installmentAmount: string | null;

  @Column({ name: 'installment_months', type: 'int', nullable: true })
  installmentMonths: number | null;

  /** 'December 2026' — the first settlement period it deducts from */
  @Column({ name: 'start_period', type: 'varchar', nullable: true })
  startPeriod: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
