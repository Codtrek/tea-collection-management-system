import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Minimal `complaints` binding — Collections only raises weight-mismatch complaints. */
@Entity('complaints')
export class ComplaintEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  type: 'weight_mismatch' | 'fertilizer_quality';

  @Column({ name: 'raised_by_user_id' })
  raisedByUserId: number;

  @Column({ name: 'collection_record_id', type: 'varchar', nullable: true })
  collectionRecordId: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', default: 'open' })
  status: 'open' | 'acknowledged' | 'resolved';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
