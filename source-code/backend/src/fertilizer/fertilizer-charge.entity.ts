import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
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
export class FertilizerChargeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** the FERT-02 dispatch that billed it (legacy / ad-hoc); null for a route-stop delivery */
  @Column({ name: 'stock_movement_id', type: 'int', nullable: true })
  stockMovementId: number | null;

  /** the delivery attempt that billed it (Fertilizer-Delivery-Addendum: charged at delivery) */
  @Column({ name: 'delivery_id', type: 'int', nullable: true })
  deliveryId: number | null;

  /** the request's payment method at delivery; null on legacy rows (= deduct) */
  @Column({ name: 'payment_method', type: 'varchar', nullable: true })
  paymentMethod: PaymentMethod | null;

  /** Null when the dispatch isn't billable to an estate (e.g. internal use). */
  @Column({ name: 'estate_id', type: 'int', nullable: true })
  estateId: number | null;

  @Column({ name: 'fertilizer_request_id', type: 'int', nullable: true })
  fertilizerRequestId: number | null;

  @Column({ name: 'rate_per_kg', type: 'decimal', precision: 8, scale: 2 })
  ratePerKg: string;

  @Column({ name: 'quantity_kg', type: 'decimal', precision: 10, scale: 2 })
  quantityKg: string;

  @Column({ name: 'total_charge', type: 'decimal', precision: 10, scale: 2 })
  totalCharge: string;

  /** Settlement business key that recovered this charge; null = outstanding. */
  @Column({ name: 'settlement_id', type: 'varchar', nullable: true })
  settlementId: string | null;

  @CreateDateColumn({ name: 'calculated_at' })
  calculatedAt: Date;
}
