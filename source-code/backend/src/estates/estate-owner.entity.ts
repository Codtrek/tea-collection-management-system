import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Extended 2026-07-26 (Estates + Payments slice) to carry the owner-level
 * fields the portal's `EstateOwner` contract needs (nic/contact/email).
 */
@Entity('tea_estate_owners')
export class EstateOwnerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  nic: string | null;

  @Column({ type: 'varchar', nullable: true })
  contact: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;
}
