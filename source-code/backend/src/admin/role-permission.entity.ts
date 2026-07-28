import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * ADM-02 — one row per (role, module) cell of the permission matrix. Seeded
 * from the portal's DEFAULT_PERMISSIONS; the backend is now the source of
 * truth for `useAuth().can()`.
 */
@Entity('role_permissions')
export class RolePermissionEntity {
  @PrimaryColumn()
  role: string;

  @PrimaryColumn()
  module: string;

  @Column()
  level: string;
}
