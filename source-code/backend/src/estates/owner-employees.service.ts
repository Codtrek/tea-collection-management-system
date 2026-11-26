import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EstateEmployee } from '../users/estate-employee.entity';
import { EstateManager } from '../users/estate-manager.entity';
import { EstateOwnerEntity } from './estate-owner.entity';
import { EstateEntity } from './estate.entity';

@Injectable()
export class OwnerEmployeesService {
  constructor(private readonly db: DataSource) {}

  async directory(userId: number) {
    const employees = await this.db.createQueryBuilder(EstateEmployee, 'employee')
      .innerJoin(EstateEntity, 'home', 'home.id = employee.estate_id')
      .innerJoin(EstateOwnerEntity, 'owner', 'owner.id = home.ownerId AND owner.userId = :userId', { userId })
      .leftJoin(EstateManager, 'manager', 'manager.employee_id = employee.id')
      .leftJoin(EstateEntity, 'assigned', 'assigned.id = manager.estate_id AND assigned.ownerId = owner.id')
      .select('employee.id', 'id').addSelect('employee.name', 'name')
      .addSelect('assigned.id', 'estateId').addSelect('assigned.name', 'estateName')
      .where("employee.role = 'manager' AND employee.is_active IS TRUE")
      .orderBy('employee.name', 'ASC').addOrderBy('employee.id', 'ASC').getRawMany();

    const availableEstates = await this.db.createQueryBuilder(EstateEntity, 'estate')
      .innerJoin(EstateOwnerEntity, 'owner', 'owner.id = estate.ownerId AND owner.userId = :userId', { userId })
      .leftJoin(EstateManager, 'manager', 'manager.estate_id = estate.id')
      .where('estate.managerId IS NULL AND manager.id IS NULL')
      .select(['estate.id', 'estate.name']).orderBy('estate.name', 'ASC').getMany();
    return { employees, availableEstates };
  }

  async changeAssignment(userId: number, employeeId: number, estateId: number, assigning: boolean) {
    return this.db.transaction(async tx => {
      const employee = await tx.createQueryBuilder(EstateEmployee, 'employee')
        .innerJoin(EstateEntity, 'home', 'home.id = employee.estate_id')
        .innerJoin(EstateOwnerEntity, 'owner', 'owner.id = home.ownerId')
        .where('owner.userId = :userId AND employee.id = :employeeId', { userId, employeeId })
        .andWhere("employee.role = 'manager' AND employee.is_active IS TRUE")
        .setLock('pessimistic_write', undefined, ['employee']).getOne();
      if (!employee) throw new NotFoundException('Manager not found.');
      const estate = await tx.createQueryBuilder(EstateEntity, 'estate')
        .innerJoin(EstateOwnerEntity, 'owner', 'owner.id = estate.ownerId')
        .where('estate.id = :estateId AND owner.userId = :userId', { estateId, userId })
        .setLock('pessimistic_write', undefined, ['estate']).getOne();
      if (!estate) throw new NotFoundException('Estate not found.');
      const manager = await tx.findOneBy(EstateManager, { employee_id: employee.id });
      if (assigning) {
        if (manager?.estate_id === estate.id && estate.managerId === manager.id) return { ok: true };
        if (manager?.estate_id != null) throw new ConflictException('End the current assignment first.');
        if (estate.managerId != null || await tx.existsBy(EstateManager, { estate_id: estate.id })) {
          throw new ConflictException('This estate already has a manager.');
        }
        const assigned = await tx.save(EstateManager, {
          id: manager?.id, employee_id: employee.id, estate_id: estate.id, assigned_at: new Date(),
        });
        await tx.update(EstateEmployee, employee.id, { estate_id: estate.id });
        await tx.update(EstateEntity, estate.id, { managerId: assigned.id });
      } else {
        if (manager?.estate_id !== estate.id) throw new ConflictException('This assignment has already changed.');
        await tx.update(EstateEntity, { id: estate.id, managerId: manager.id }, { managerId: null });
        await tx.update(EstateManager, manager.id, { estate_id: null, assigned_at: null });
      }
      return { ok: true };
    });
  }
}
