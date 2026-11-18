import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstateEntity } from '../estates/estate.entity';
import { FertilizerRequestEntity } from './fertilizer-request.entity';

/** A cash or bank-transfer payment for fertilizer, recorded by an officer. */
@Entity('fertilizer_payments')
@Check('fertilizer_payments_amount_check', `(amount > (0)::numeric)`)
@Check(
  'fertilizer_payments_check',
  `(((method)::text <> 'bank'::text) OR (reference IS NOT NULL))`,
)
@Check(
  'fertilizer_payments_method_check',
  `((method)::text = ANY ((ARRAY['cash'::character varying, 'bank'::character varying])::text[]))`,
)
@Index('idx_fert_payments_estate', ['estateId'])
@Index('idx_fert_payments_request', ['requestId'])
export class FertilizerPaymentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_id' })
  @ForeignKey(() => FertilizerRequestEntity, {
    name: 'fertilizer_payments_request_id_fkey',
  })
  requestId: number;

  @Column({ name: 'estate_id' })
  @ForeignKey(() => EstateEntity, {
    name: 'fertilizer_payments_estate_id_fkey',
  })
  estateId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'paid_on', type: 'date' })
  paidOn: string;

  @Column({ type: 'varchar', length: 10 })
  method: 'cash' | 'bank';

  /** required for a bank transfer */
  @Column({ type: 'varchar', nullable: true, length: 100 })
  reference: string | null;

  @Column({ name: 'recorded_by', type: 'varchar', length: 100 })
  recordedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
