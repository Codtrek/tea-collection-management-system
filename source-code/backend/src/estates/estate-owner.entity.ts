import { Column, Entity, ForeignKey, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

/**
 * Extended 2026-07-26 (Estates + Payments slice) to carry the owner-level
 * fields the portal's `EstateOwner` contract needs (nic/contact/email).
 *
 * The only mapping of `public.tea_estate_owners`; types, lengths and
 * constraint names mirror `src/migrations/baseline.sql` exactly.
 */
@Entity('tea_estate_owners')
export class EstateOwnerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** One owner profile per user: UNIQUE via `tea_estate_owners_user_id_key`. */
  @Column({ name: 'user_id', type: 'integer', unique: true })
  @ForeignKey(() => User, { name: 'tea_estate_owners_user_id_fkey' })
  userId: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  nic: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  contact: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;
}
