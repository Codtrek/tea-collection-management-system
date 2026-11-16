import {
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstateEntity } from '../estates/estate.entity';
import { FertilizerRequestEntity } from './fertilizer-request.entity';
import { StockMovementEntity } from './stock-movement.entity';
import type { PaymentMethod } from './fertilizer-map';

/**
 * Estate Owner Lifetime History slice — one row per *dispatch event*, written
 * alongside the `stock_movements` row an Outgoing dispatch already creates
 * (only when a rate is supplied — not every dispatch is billed). This is the
 * source for EST-10's Outstanding-to-factory figure: Σ total_charge for an
 * estate, minus what's been recovered (`settlementId` set once a settlement's
 * `fertilizer_deduction` recovers it).
 *
 * Redefines the old `fertilizer_charges` table, which was keyed 1:1 on
 * `fertilizer_request_id` and could hold neither an ad-hoc dispatch nor the
 * repeated partial dispatches one approved request legitimately produces.
 */
@Entity('fertilizer_charges')
@Index('idx_fertilizer_charges_estate', ['estateId'])
@Index('idx_fertilizer_charges_settlement', ['settlementId'])
export class FertilizerChargeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * The FERT-02 dispatch that billed it (legacy / ad-hoc); null for a route-stop delivery
   * (Fertilizer-Delivery-Addendum). UNIQUE via `fertilizer_charges_stock_movement_id_key`.
   */
  @Column({
    name: 'stock_movement_id',
    type: 'int',
    unique: true,
    nullable: true,
  })
  @ForeignKey(() => StockMovementEntity, {
    name: 'fertilizer_charges_stock_movement_id_fkey',
  })
  stockMovementId: number | null;

  /** the delivery attempt that billed it (Fertilizer-Delivery-Addendum: charged at delivery) */
  @Column({ name: 'delivery_id', type: 'int', unique: true, nullable: true })
  deliveryId: number | null;

  /** the request's payment method at delivery; null on legacy rows (= deduct) */
  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  paymentMethod: PaymentMethod | null;

  /** Null when the dispatch isn't billable to an estate (e.g. internal use). */
  @Column({ name: 'estate_id', type: 'int', nullable: true })
  @ForeignKey(() => EstateEntity, { name: 'fertilizer_charges_estate_id_fkey' })
  estateId: number | null;

  @Column({ name: 'fertilizer_request_id', type: 'int', nullable: true })
  @ForeignKey(() => FertilizerRequestEntity, {
    name: 'fertilizer_charges_fertilizer_request_id_fkey',
  })
  fertilizerRequestId: number | null;

  @Column({ name: 'rate_per_kg', type: 'decimal', precision: 8, scale: 2 })
  ratePerKg: string;

  @Column({ name: 'quantity_kg', type: 'decimal', precision: 10, scale: 2 })
  quantityKg: string;

  @Column({ name: 'total_charge', type: 'decimal', precision: 10, scale: 2 })
  totalCharge: string;

  /** Settlement business key that recovered this charge; null = outstanding. */
  @Column({
    name: 'settlement_id',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  settlementId: string | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'calculated_at', nullable: true })
  calculatedAt: Date;
}
