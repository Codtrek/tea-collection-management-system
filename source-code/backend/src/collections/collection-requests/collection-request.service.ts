import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AppRole } from '../../auth/role-map';
import { EstateOwnerEntity } from '../../estates/estate-owner.entity';
import { EstateEntity } from '../../estates/estate.entity';
import { EstateManager } from '../../users/estate-manager.entity';
import type { CollectionRequestDto } from './dto/create-collection-request.dto';
import { CollectionRequestEntity } from './tea-collection-request.entity';

@Injectable()
export class CollectionRequestService {
  constructor(
    @InjectRepository(CollectionRequestEntity)
    private readonly requests: Repository<CollectionRequestEntity>,
    @InjectRepository(EstateEntity)
    private readonly estates: Repository<EstateEntity>,
  ) {}

  async create(
    dto: CollectionRequestDto,
    userId: number,
    role: AppRole,
  ): Promise<CollectionRequestEntity> {
    const estate = this.estates.createQueryBuilder('estate');

    if (role === 'Estate Owner') {
      estate
        .innerJoin(EstateOwnerEntity, 'owner', 'owner.id = estate.ownerId')
        .andWhere('owner.userId = :userId', { userId });
    } else if (role === 'Estate Manager') {
      estate
        .innerJoin(EstateManager, 'manager', 'manager.estate_id = estate.id')
        .innerJoin('manager.employee', 'employee')
        .andWhere('employee.user_id = :userId', { userId });
    } else {
      throw new ForbiddenException(
        'Only estate owners and managers can request collection.',
      );
    }

    const hasAccess = await estate
      .andWhere('estate.id = :estateId', { estateId: dto.estateId })
      .getExists();
    if (!hasAccess) {
      throw new ForbiddenException(
        'You cannot request collection for this estate.',
      );
    }

    return this.requests.save({
      estateId: dto.estateId,
      requestedByUserId: userId,
      notes: dto.notes?.trim() || null,
      status: 'open',
    });
  }
}
