import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
}