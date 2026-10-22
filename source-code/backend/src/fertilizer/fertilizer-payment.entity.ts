import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** A cash or bank-transfer payment for fertilizer, recorded by an officer. */
@Entity('fertilizer_payments')
export class FertilizerPaymentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_id' })
  requestId: number;

  @Column({ name: 'estate_id' })
  estateId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'paid_on', type: 'date' })
  paidOn: string;

  @Column({ type: 'varchar' })
  method: 'cash' | 'bank';

  /** required for a bank transfer */
  @Column({ type: 'varchar', nullable: true })
  reference: string | null;

  @Column({ name: 'recorded_by', type: 'varchar' })
  recordedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
