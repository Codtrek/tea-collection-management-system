import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tea_estate_owners')
export class TeaEstateOwnerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  name: string;
}
