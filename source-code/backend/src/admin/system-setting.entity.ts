import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * ADM-03 — one row per system-setting key; `value` is arbitrary JSON so a key
 * can hold a scalar, a group of toggles, or a nested object without a schema
 * change.
 */
@Entity('system_settings')
export class SystemSettingEntity {
  @PrimaryColumn({ type: 'varchar', length: 60 })
  key: string;

  @Column({ type: 'jsonb' })
  value: unknown;

  @Column({ name: 'updated_by', type: 'varchar', length: 100, nullable: true })
  updatedBy: string | null;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    nullable: true,
    default: () => 'now()',
  })
  updatedAt: Date | null;
}
