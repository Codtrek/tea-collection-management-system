import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type EstateRecoveryKind = 'settlement' | 'cash' | 'bank';

/**
 * One repayment of an estate advance (Estate-Owner-Advances-Addendum §3–4): a settlement period
 * (`planned_amount` = its installment, `amount` = what it actually took — the rest carried
 * forward) or an early cash / bank repayment (`period` and `settlement_id` null).
 * remaining = advance amount − Σ recovered (backend/src/advances/installments.ts).
 */
@Entity('estate_advance_recoveries')
export class EstateAdvanceRecoveryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'advance_id', type: 'varchar' })
  advanceId: string;

  @Column({ name: 'settlement_id', type: 'varchar', nullable: true })
  settlementId: string | null;

  @Column({ type: 'varchar', default: 'settlement' })
  kind: EstateRecoveryKind;

  /** the settlement period, e.g. 'July 2026'; null for an early repayment */
  @Column({ type: 'varchar', nullable: true })
  period: string | null;

  @Column({
    name: 'planned_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  plannedAmount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', default: 'recovered' })
  status: 'reserved' | 'recovered';

  @Column({ type: 'varchar', nullable: true })
  reference: string | null;

  @Column({ name: 'paid_on', type: 'date', nullable: true })
  paidOn: string | null;

  @Column({ name: 'recorded_by', type: 'varchar', nullable: true })
  recordedBy: string | null;

  @Column({ name: 'recovered_at', type: 'timestamp' })
  recoveredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
