import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * ADM-02 — one row per (role, module) cell of the permission matrix. Seeded
 * from the portal's DEFAULT_PERMISSIONS; the backend is now the source of
 * truth for `useAuth().can()`.
 */
@Entity('role_permissions')
@Check(
  'role_permissions_level_check',
  `"level" IN ('none', 'view', 'edit', 'approve')`,
)
@Check(
  'role_permissions_role_check',
  `"role" IN ('Administrator', 'Officer', 'Manager', 'ReceivingOfficer')`,
)
export class RolePermissionEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  role: string;

  @PrimaryColumn({ type: 'varchar', length: 30 })
  module: string;

  @Column({ type: 'varchar', length: 10 })
  level: string;
}
