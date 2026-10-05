import {
    Column,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Estate } from './estate.entity';

@Entity('tea_estate_owners')
export class EstateOwner {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @Column()
    name: string;

    @OneToMany(() => Estate, (estate) => estate.owner)
    estate: Estate[];
}