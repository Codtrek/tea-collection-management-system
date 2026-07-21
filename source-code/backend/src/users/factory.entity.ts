import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('factories')
export class Factory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  location: string;
}
