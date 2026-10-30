import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { EstateEntity } from './estate.entity';
import type { DbAdvanceStatus } from './estate-map';

/** EST-05/06 — money issued ahead of settlement, deducted at the next processed run. */
@Entity('estate_advances')
@Check(
  'estate_advances_status_check',
  `"status" IN ('pending_deduction', 'deducted')`,
)
@Index('idx_estate_advances_estate', ['estateId'])
export class EstateAdvanceEntity {
  /** Business key, e.g. 'EADV-2026-0031' — not a generated id. */
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id: string;

  @Column({ name: 'estate_id', type: 'int' })
  @ForeignKey(() => EstateEntity, { name: 'estate_advances_estate_id_fkey' })
  estateId: number;

  @Column({ name: 'estate_name', type: 'varchar', length: 100 })
  estateName: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'date_issued', type: 'date' })
  dateIssued: string;

  @Column({ name: 'issued_by', type: 'varchar', length: 100 })
  issuedBy: string;

  @Column({ type: 'varchar', length: 20, default: 'pending_deduction' })
  status: DbAdvanceStatus;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
