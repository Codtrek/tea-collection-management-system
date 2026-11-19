import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { TransportRateEntity } from '../admin/transport-rate.entity';
import { EstateEntity } from './estate.entity';
import type { DbSettlementStatus } from './estate-map';

/**
 * EST-07/08 — one row per estate per period. A generated settlement (Settlement-Addendum)
 * carries the generator's whole calculation in `calculation` (live while pending, frozen when
 * processed); its columns hold the totals. A seeded snapshot without one is history, or
 * 'legacy' (read-only, never processed).
 */
@Entity('settlements')
@Check(
  'settlements_status_check',
  `((status)::text = ANY ((ARRAY['pending'::character varying, 'processed'::character varying, 'legacy'::character varying])::text[]))`,
)
@Check(
  'settlements_payout_method_check',
  `((payout_method)::text = ANY ((ARRAY['bank'::character varying, 'cash'::character varying])::text[]))`,
)
@Index('settlements_estate_period_live_key', ['estateId', 'period'], {
  unique: true,
  where: `((status)::text <> 'legacy'::text)`,
})
@Index('idx_settlements_estate', ['estateId'])
@Index('idx_settlements_status', ['status'])
@Check(
  'settlements_transport_status_check',
  `((transport_status)::text = ANY ((ARRAY['charged'::character varying, 'exempt'::character varying, 'no_deliveries'::character varying])::text[]))`,
)
export class SettlementEntity {
  /** Business key, e.g. 'SET-2026-07-001' — not a generated id. */
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id: string;

  @Column({ name: 'estate_id', type: 'int' })
  @ForeignKey(() => EstateEntity, { name: 'settlements_estate_id_fkey' })
  estateId: number;

  @Column({ name: 'estate_name', type: 'varchar', length: 100 })
  estateName: string;

  @Column({ type: 'varchar', length: 20 })
  period: string;

  @Column({
    name: 'super_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  superKg: string;

  @Column({
    name: 'normal_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  normalKg: string;

  @Column({ name: 'super_rate', type: 'decimal', precision: 8, scale: 2 })
  superRate: string;

  @Column({ name: 'normal_rate', type: 'decimal', precision: 8, scale: 2 })
  normalRate: string;

  @Column({
    name: 'transport_cost',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  transportCost: string;

  @Column({
    name: 'fertilizer_deduction',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  fertilizerDeduction: string;

  @Column({
    name: 'advance_deduction',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  advanceDeduction: string;

  /**
   * Signed Rs. carried in from approved grading corrections on already-SETTLED deliveries
   * (settlement_adjustments). Set when the settlement is processed; the past is never rewritten.
   */
  @Column({
    name: 'adjustment_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  adjustmentAmount: string;

  /**
   * Transport as frozen when processed (Administration-Addendum §4). NULL on rows processed
   * before the monthly charge existed. `transportCost` is what was TAKEN; the month's charge
   * plus what came in from the last settlement, minus what was taken, went out as a carry.
   */
  @Column({
    name: 'transport_status',
    type: 'varchar',
    nullable: true,
    length: 14,
  })
  transportStatus: 'charged' | 'exempt' | 'no_deliveries' | null;

  @Column({
    name: 'transport_charge',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  transportCharge: string | null;

  @Column({ name: 'transport_version_id', type: 'int', nullable: true })
  @ForeignKey(() => TransportRateEntity, {
    name: 'settlements_transport_version_id_fkey',
  })
  transportVersionId: number | null;

  @Column({
    name: 'transport_carried_in',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  transportCarriedIn: string;

  @Column({
    name: 'transport_carried_out',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  transportCarriedOut: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: DbSettlementStatus;

  /** why a seeded snapshot is kept read-only (status 'legacy') */
  @Column({ name: 'legacy_reason', type: 'text', nullable: true })
  legacyReason: string | null;

  /** the gross the generator priced (Σ leaf lines); null on seeded rows = kg × rate */
  @Column({
    name: 'gross_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  grossAmount: string | null;

  /** the generator's calculation (SettlementCalculation) — frozen when processed */
  @Column({ type: 'jsonb', nullable: true })
  calculation: unknown;

  @Column({ name: 'payout_method', type: 'varchar', length: 4, nullable: true })
  payoutMethod: 'bank' | 'cash' | null;

  /** why the estate is left out of processing (e.g. a bank payout with no account) */
  @Column({ name: 'excluded_reason', type: 'text', nullable: true })
  excludedReason: string | null;

  @Column({ name: 'prepared_by', type: 'varchar', length: 100, nullable: true })
  preparedBy: string | null;

  @Column({ name: 'prepared_at', type: 'timestamptz', nullable: true })
  preparedAt: Date | null;

  @Column({ name: 'self_delivery', default: false })
  selfDelivery: boolean;

  @Column({ name: 'missing_bank', default: false })
  missingBank: boolean;

  @Column({
    name: 'processed_by',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  processedBy: string | null;

  @Column({ name: 'processed_on', type: 'timestamp', nullable: true })
  processedOn: Date | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
