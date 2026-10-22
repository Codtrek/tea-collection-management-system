import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('estate_employees')
export class EstateEmployee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  estate_id: number;

  @Column()
  name: string;

  @Column({ type: 'date' })
  date_of_birth: Date;

  @Column()
  nic: string;

  @Column()
  role: 'manager' | 'plucking_employee';

  @Column({ default: true })
  is_active: boolean;
}
