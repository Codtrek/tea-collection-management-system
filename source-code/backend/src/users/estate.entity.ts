import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { EstateOwner } from './estate-owner.entity';

@Entity('estates')
export class Estate {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true})
    location: string;

    @ManyToOne(() => EstateOwner, (owner) => owner.estate)
    @JoinColumn({ name: 'owner_id' })
    owner: EstateOwner;
}