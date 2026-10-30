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

  /** The HR record this agent IS. Employees are the source of truth for who is an agent and whether they are active. */
  @Column({ name: 'hr_employee_id', type: 'int', nullable: true })
  hrEmployeeId: number | null;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;
}
