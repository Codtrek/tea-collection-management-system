import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('device_push_tokens')
export class DevicePushTokenEntity {
  @PrimaryColumn()
  token: string;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', nullable: true })
  platform: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
