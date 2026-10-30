import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * ADM-03 — one row per system-setting key; `value` is arbitrary JSON so a key
 * can hold a scalar, a group of toggles, or a nested object without a schema
 * change.
 */
@Entity('system_settings')
export class SystemSettingEntity {
  @PrimaryColumn()
  key: string;

  @Column({ type: 'jsonb' })
  value: unknown;

  @Column({ name: 'updated_by', type: 'varchar', nullable: true })
  updatedBy: string | null;

  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date | null;
}
