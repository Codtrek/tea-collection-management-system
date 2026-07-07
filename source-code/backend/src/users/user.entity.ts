import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type UserRole =
  | 'estate_owner'
  | 'estate_manager'
  | 'employee'
  | 'collector'
  | 'receiving_officer'
  | 'factory_admin'
  | 'factory_officer'
  | 'factory_manager';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  phone: string;

  @Column()
  password_hash: string;

  @Column({ type: 'varchar' })
  role: UserRole;

  @Column()
  created_at: Date;
}
