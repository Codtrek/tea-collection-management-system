import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('collectors')
export class CollectorEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employee_id: number;

  @Column()
  factory_id: number;
}
