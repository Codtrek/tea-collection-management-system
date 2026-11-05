import { Column, Entity, ForeignKey, PrimaryGeneratedColumn } from 'typeorm';
import { EmployeeEntity } from '../employees/employee.entity';
import { Factory } from '../users/factory.entity';
import { FactoryEmployee } from '../users/factory-employee.entity';

/** Read-mostly view of `collection_agents`; the agent's name/login live on factory_employees. */
@Entity('collection_agents')
export class CollectionAgentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** UNIQUE via `collection_agents_employee_id_key`. */
  @Column({ name: 'employee_id', type: 'int', unique: true })
  @ForeignKey(() => FactoryEmployee, {
    name: 'collection_agents_employee_id_fkey',
  })
  employeeId: number;

  @Column({ name: 'factory_id', type: 'int' })
  @ForeignKey(() => Factory, { name: 'collection_agents_factory_id_fkey' })
  factoryId: number;

  /** The HR record this agent IS. Employees are the source of truth for who is an agent and whether they are active. */
  /** UNIQUE via `collection_agents_hr_employee_id_key`. */
  @Column({
    name: 'hr_employee_id',
    type: 'int',
    nullable: true,
    unique: true,
  })
  @ForeignKey(() => EmployeeEntity, {
    name: 'collection_agents_hr_employee_id_fkey',
  })
  hrEmployeeId: number | null;

  /** Nullable in the DB, but always filled by its default. */
  @Column({ name: 'is_available', nullable: true, default: true })
  isAvailable: boolean;
}
