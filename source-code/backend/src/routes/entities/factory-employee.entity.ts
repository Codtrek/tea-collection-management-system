import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('factory_employees')
export class FactoryEmployeeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  factory_id: number;
}
