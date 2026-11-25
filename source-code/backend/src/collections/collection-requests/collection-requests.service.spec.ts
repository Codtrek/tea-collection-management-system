import { ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { EstateEntity } from '../../estates/estate.entity';
import { CollectionRequestService } from './collection-request.service';
import type { CollectionRequestEntity } from './tea-collection-request.entity';

describe('CollectionRequestService', () => {
  const estateQuery = {
    innerJoin: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getExists: jest.fn(),
  };
  const save = jest.fn();
  const service = new CollectionRequestService(
    { save } as unknown as Repository<CollectionRequestEntity>,
    {
      createQueryBuilder: jest.fn().mockReturnValue(estateQuery),
    } as unknown as Repository<EstateEntity>,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates an open request for the owner of the estate', async () => {
    estateQuery.getExists.mockResolvedValueOnce(true);
    const fields = {
      estateId: 7,
      requestedByUserId: 12,
      notes: 'Ready for pickup',
      status: 'open',
    };
    const request = { id: 1, ...fields };
    save.mockResolvedValueOnce(request);

    await expect(
      service.create(
        { estateId: 7, notes: ' Ready for pickup ' },
        12,
        'Estate Owner',
      ),
    ).resolves.toEqual(request);
    expect(save).toHaveBeenCalledWith(fields);
  });

  it('accepts the assigned estate manager and defaults notes to null', async () => {
    estateQuery.getExists.mockResolvedValueOnce(true);

    await service.create({ estateId: 7 }, 12, 'Estate Manager');

    expect(estateQuery.andWhere).toHaveBeenCalledWith(
      'employee.user_id = :userId',
      {
        userId: 12,
      },
    );
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ notes: null }));
  });

  it('rejects requests for an estate the caller does not own or manage', async () => {
    estateQuery.getExists.mockResolvedValueOnce(false);

    await expect(
      service.create({ estateId: 7 }, 12, 'Estate Owner'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects factory staff', async () => {
    await expect(
      service.create({ estateId: 7 }, 12, 'Manager'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(save).not.toHaveBeenCalled();
  });
});
