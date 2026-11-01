import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * How much of an estate advance one processed settlement recovered (Estate-Owner-Advances-
 * Addendum §3). remaining = advance amount − Σ recoveries (estate-advance-balance.ts).
 */
@Entity('estate_advance_recoveries')
export class EstateAdvanceRecoveryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'advance_id', type: 'varchar' })
  advanceId: string;

  @Column({ name: 'settlement_id', type: 'varchar' })
  settlementId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'recovered_at', type: 'timestamp' })
  recoveredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
