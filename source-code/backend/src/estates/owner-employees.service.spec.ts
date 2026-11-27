import { ConflictException, NotFoundException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { EstateEmployee } from '../users/estate-employee.entity';
import { EstateManager } from '../users/estate-manager.entity';
import { EstateEntity } from './estate.entity';
import { OwnerEmployeesService } from './owner-employees.service';

describe('estate manager assignments', () => {
  const query = {
    innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(), setLock: jest.fn().mockReturnThis(), getOne: jest.fn(),
  };
  const tx = {
    createQueryBuilder: () => query, findOneBy: jest.fn(), existsBy: jest.fn(),
    update: jest.fn(), save: jest.fn(),
  };
  const service = new OwnerEmployeesService({
    transaction: (run: (manager: typeof tx) => unknown) => run(tx),
  } as unknown as DataSource);
  const employee = { id: 12 };
  const manager = { id: 20, employee_id: 12, estate_id: 7 };
  beforeEach(() => jest.clearAllMocks());

  it('ends the assignment while retaining the manager and employee identities', async () => {
    query.getOne.mockResolvedValueOnce(employee).mockResolvedValueOnce({ id: 7, managerId: 20 });
    tx.findOneBy.mockResolvedValueOnce(manager);
    await service.changeAssignment(1, 12, 7, false);
    expect(tx.update).toHaveBeenCalledWith(EstateManager, 20, { estate_id: null, assigned_at: null });
    expect(tx.update).toHaveBeenCalledWith(EstateEntity, { id: 7, managerId: 20 }, { managerId: null });
  });

  it('uses the same manager record when assigning another estate', async () => {
    query.getOne.mockResolvedValueOnce(employee).mockResolvedValueOnce({ id: 8, managerId: null });
    tx.findOneBy.mockResolvedValueOnce({ ...manager, estate_id: null });
    tx.existsBy.mockResolvedValueOnce(false);
    tx.save.mockResolvedValueOnce({ id: 20 });
    await service.changeAssignment(1, 12, 8, true);
    expect(tx.save).toHaveBeenCalledWith(EstateManager, expect.objectContaining({ id: 20, estate_id: 8 }));
    expect(tx.update).toHaveBeenCalledWith(EstateEmployee, 12, { estate_id: 8 });
    expect(tx.update).toHaveBeenCalledWith(EstateEntity, 8, { managerId: 20 });
  });

  it('rejects an unavailable estate before changing any records', async () => {
    query.getOne.mockResolvedValueOnce(employee).mockResolvedValueOnce(null);
    await expect(service.changeAssignment(1, 12, 9, true)).rejects.toThrow(NotFoundException);
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.save).not.toHaveBeenCalled();
  });

  it('rejects an occupied estate even for legacy assignments without a manager pointer', async () => {
    query.getOne.mockResolvedValueOnce(employee).mockResolvedValueOnce({ id: 8, managerId: null });
    tx.findOneBy.mockResolvedValueOnce({ ...manager, estate_id: null });
    tx.existsBy.mockResolvedValueOnce(true);
    await expect(service.changeAssignment(1, 12, 8, true)).rejects.toThrow(ConflictException);
    expect(tx.save).not.toHaveBeenCalled();
  });
});
