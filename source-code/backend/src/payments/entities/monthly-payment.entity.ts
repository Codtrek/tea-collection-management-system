import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type PaymentStatus = 'pending' | 'finalized' | 'paid';

@Entity('monthly_payments')
export class MonthlyPaymentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  factory_id: number;

  @Column()
  owner_id: number;

  @Column({ type: 'date' })
  payment_month: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  super_weight_kg: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  normal_weight_kg: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  gross_amount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  transport_cost: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  fertilizer_deductions: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  advance_deductions: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  bank_transfer_fee: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  net_amount: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: PaymentStatus;

  @Column({ type: 'timestamp', nullable: true })
  finalized_at: Date | null;
}
