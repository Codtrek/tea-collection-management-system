import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('estates')
export class EstateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  owner_id: number;

  @Column()
  name: string;

  @Column()
  location: string;
}
