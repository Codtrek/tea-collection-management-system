import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Factory } from './factory.entity';

/**
 * Profile row for factory-side users (Administrator/Officer/Manager in the portal).
 * Read-only here — full CRUD lands with the Employees module slice.
 */
@Entity('factory_employees')
export class FactoryEmployee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  factory_id: number;

  @Column()
  name: string;

  /** the person's NIC — Salary Advances' no-self-approval check matches it to the HR record */
  @Column({ type: 'varchar', nullable: true })
  nic: string | null;

  @ManyToOne(() => Factory)
  @JoinColumn({ name: 'factory_id' })
  factory: Factory;
}
