import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Estate } from './estate.entity';
import { EstateEmployee } from './estate-employee.entity';

@Entity('tea_estate_managers')
export class EstateManager {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employee_id: number;

  @Column()
  estate_id: number;

  @Column()
  assigned_at: Date;

  @ManyToOne(() => EstateEmployee)
  @JoinColumn({ name: 'employee_id' })
  employee: EstateEmployee;

  @ManyToOne(() => Estate)
  @JoinColumn({ name: 'estate_id' })
  estate: Estate;
}
