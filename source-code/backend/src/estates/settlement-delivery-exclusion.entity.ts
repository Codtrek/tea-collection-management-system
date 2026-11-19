import {
  Check,
  Column,
  Entity,
  ForeignKey,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CollectionRecordEntity } from '../collections/collection-record.entity';

/**
 * A delivery left out of a settlement month, with the reason (Settlement-Addendum). It rolls
 * into the next month the estate is settled for, priced at the rate of its own date. One row per
 * delivery: excluding it again from a later month moves the row on.
 *  • by a Manager — an ungraded delivery that would otherwise block the estate
 *  • `auto` — still inside the grading correction window when the month was processed
 */
@Entity('settlement_delivery_exclusions')
@Check(
  'settlement_delivery_exclusions_month_check',
  `((month)::text ~ '^[0-9]{4}-[0-9]{2}$'::text)`,
)
export class SettlementDeliveryExclusionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'delivery_id', type: 'varchar', length: 20, unique: true })
  @ForeignKey(() => CollectionRecordEntity, {
    name: 'settlement_delivery_exclusions_delivery_id_fkey',
  })
  deliveryId: string;

  /** 'YYYY-MM' the delivery was left out of */
  @Column({ type: 'varchar', length: 7 })
  month: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ default: false })
  auto: boolean;

  @Column({ name: 'excluded_by', type: 'varchar', length: 100 })
  excludedBy: string;

  @Column({ name: 'excluded_at', type: 'timestamptz', default: () => 'now()' })
  excludedAt: Date;
}
