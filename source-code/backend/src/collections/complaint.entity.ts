import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FertilizerRequestEntity } from '../fertilizer/fertilizer-request.entity';
import { User } from '../users/user.entity';
import { CollectionRecordEntity } from './collection-record.entity';

/** Minimal `complaints` binding — Collections only raises weight-mismatch complaints. */
@Entity('complaints')
@Check(
  'complaints_status_check',
  `"status" IN ('open', 'acknowledged', 'resolved')`,
)
@Check(
  'complaints_type_check',
  `"type" IN ('weight_mismatch', 'fertilizer_quality')`,
)
export class ComplaintEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30 })
  type: 'weight_mismatch' | 'fertilizer_quality';

  @Column({ name: 'raised_by_user_id', type: 'int' })
  @ForeignKey(() => User, { name: 'complaints_raised_by_user_id_fkey' })
  raisedByUserId: number;

  @Column({
    name: 'collection_record_id',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  @ForeignKey(() => CollectionRecordEntity, {
    name: 'complaints_collection_record_id_fkey',
  })
  collectionRecordId: string | null;

  /** For `fertilizer_quality` complaints; not written by the portal yet. */
  @Column({ name: 'fertilizer_request_id', type: 'int', nullable: true })
  @ForeignKey(() => FertilizerRequestEntity, {
    name: 'complaints_fertilizer_request_id_fkey',
  })
  fertilizerRequestId: number | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Nullable in the DB, but always filled by its default. */
  @Column({ type: 'varchar', length: 20, nullable: true, default: 'open' })
  status: 'open' | 'acknowledged' | 'resolved';

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
