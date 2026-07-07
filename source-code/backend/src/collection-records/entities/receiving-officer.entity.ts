import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('receiving_officers')
export class ReceivingOfficerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employee_id: number;

  @Column()
  factory_id: number;
}
