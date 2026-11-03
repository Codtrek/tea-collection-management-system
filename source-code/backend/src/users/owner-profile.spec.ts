import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { EstateOwnerEntity } from '../estates/estate-owner.entity';

describe('owner profile updates', () => {
  function setup() {
    const user = { id: 5, role: 'estate_owner', status: 'active', name: 'Old', phone: '0711111111' };
    const owner = { id: 9, userId: 5, name: 'Old', contact: user.phone, email: null };
    const manager = {
      findOne: jest.fn(async (entity: unknown) => entity === User ? user : owner),
      save: jest.fn(async (value: unknown) => value),
    };
    const repository = {
      manager: { transaction: jest.fn(async (callback: (m: typeof manager) => unknown) => callback(manager)) },
      findOne: jest.fn(async () => user),
    };
    const ownerRepository = { findOne: jest.fn(async () => owner) };
    const service = new UsersService(repository as never, {} as never, ownerRepository as never, {} as never, {} as never);
    return { service, user, owner, manager };
  }
  it('updates both records for the authenticated user', async () => {
    const {service, user, owner, manager} = setup();
    const result = await service.updateOwnerDetails(5, {name: 'New', phone: '0771234567', email: 'new@example.com'});
    expect(manager.findOne).toHaveBeenCalledWith(EstateOwnerEntity, expect.objectContaining({where: {userId: 5}}));
    expect(user.name).toBe('New'); expect(owner.name).toBe('New');
    expect(user.phone).toBe('0771234567'); expect(owner.contact).toBe('0771234567');
    expect(result.email).toBe('new@example.com'); expect(manager.save).toHaveBeenCalledTimes(2);
  });
  it('rejects suspended accounts before writing', async () => {
    const {service, user, manager} = setup(); user.status = 'suspended';
    await expect(service.updateOwnerDetails(5, {name: 'New'})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('reports duplicate mobile numbers', async () => {
    const {service, manager} = setup(); manager.save.mockRejectedValueOnce({code: '23505'} as never);
    await expect(service.updateOwnerDetails(5, {phone: '0771234567'})).rejects.toBeInstanceOf(ConflictException);
  });
  it('allows removing an email', async () => {
    const {service, owner} = setup(); await service.updateOwnerDetails(5, {email: ''});
    expect(owner.email).toBeNull();
  });
});
