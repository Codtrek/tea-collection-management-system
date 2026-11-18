import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EstateAdvanceEntity } from './estate-advance.entity';
import { SettlementEntity } from './settlement.entity';

export type EstateRecoveryKind = 'settlement' | 'cash' | 'bank';

/**
 * One repayment of an estate advance (Estate-Owner-Advances-Addendum §3–4): a settlement period
 * (`planned_amount` = its installment, `amount` = what it actually took — the rest carried
 * forward) or an early cash / bank repayment (`period` and `settlement_id` null).
 * remaining = advance amount − Σ recovered (backend/src/advances/installments.ts).
 */
@Entity('estate_advance_recoveries')
@Unique('estate_advance_recoveries_advance_id_settlement_id_key', [
  'advanceId',
  'settlementId',
])
@Check('estate_advance_recoveries_amount_check', `(amount >= (0)::numeric)`)
@Check(
  'estate_advance_recoveries_kind_check',
  `((kind)::text = ANY ((ARRAY['settlement'::character varying, 'cash'::character varying, 'bank'::character varying])::text[]))`,
)
@Check(
  'estate_advance_recoveries_status_check',
  `((status)::text = ANY ((ARRAY['reserved'::character varying, 'recovered'::character varying])::text[]))`,
)
@Index('estate_advance_recoveries_advance_idx', ['advanceId'])
export class EstateAdvanceRecoveryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'advance_id', type: 'varchar', length: 20 })
  @ForeignKey(() => EstateAdvanceEntity, {
    name: 'estate_advance_recoveries_advance_id_fkey',
  })
  advanceId: string;

  @Column({
    name: 'settlement_id',
    type: 'varchar',
    nullable: true,
    length: 20,
  })
  @ForeignKey(() => SettlementEntity, {
    name: 'estate_advance_recoveries_settlement_id_fkey',
  })
  settlementId: string | null;

  @Column({ type: 'varchar', default: 'settlement', length: 12 })
  kind: EstateRecoveryKind;

  /** the settlement period, e.g. 'July 2026'; null for an early repayment */
  @Column({ type: 'varchar', nullable: true, length: 30 })
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

  @Column({ type: 'varchar', default: 'recovered', length: 10 })
  status: 'reserved' | 'recovered';

  @Column({ type: 'varchar', nullable: true, length: 100 })
  reference: string | null;

  @Column({ name: 'paid_on', type: 'date', nullable: true })
  paidOn: string | null;

  @Column({ name: 'recorded_by', type: 'varchar', nullable: true, length: 100 })
  recordedBy: string | null;

  @Column({ name: 'recovered_at', type: 'timestamp' })
  recoveredAt: Date;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
