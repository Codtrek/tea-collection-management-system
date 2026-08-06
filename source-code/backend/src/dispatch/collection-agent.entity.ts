import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Read-mostly view of `collection_agents`; the agent's name/login live on factory_employees. */
@Entity('collection_agents')
export class CollectionAgentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id' })
  employeeId: number;

  @Column({ name: 'factory_id' })
  factoryId: number;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;
}
