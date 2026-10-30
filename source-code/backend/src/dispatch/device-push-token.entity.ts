import {
  Column,
  Entity,
  ForeignKey,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('device_push_tokens')
@Index('idx_push_tokens_user', ['userId'])
export class DevicePushTokenEntity {
  @PrimaryColumn({ type: 'varchar', length: 200 })
  token: string;

  @Column({ name: 'user_id', type: 'int' })
  @ForeignKey(() => User, { name: 'device_push_tokens_user_id_fkey' })
  userId: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  platform: string | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date;
}
