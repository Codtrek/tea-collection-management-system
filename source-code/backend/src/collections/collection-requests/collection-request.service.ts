import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  async listOwnerEstates(userId: number, role: AppRole) {
    if (role !== 'Estate Owner') {
      throw new ForbiddenException('Only estate owners can view this list.');
    }
    return this.estates.createQueryBuilder('estate')
      .select(['estate.id', 'estate.name', 'estate.location', 'estate.ytdDeliveriesKg'])
      .innerJoin(EstateOwnerEntity, 'owner', 'owner.id = estate.ownerId')
      .where('owner.userId = :userId', { userId })
      .orderBy('estate.name', 'ASC')
      .addOrderBy('estate.id', 'ASC')
      .getMany();
  }

  async listForOwner(userId: number, role: AppRole) {
    if (role !== 'Estate Owner') {
      throw new ForbiddenException('Only estate owners can view this list.');
    }

    return this.requests
      .createQueryBuilder('request')
      .innerJoin('request.estate', 'estate')
      .addSelect(['estate.id', 'estate.name'])
      .innerJoin(EstateOwnerEntity, 'owner', 'owner.id = estate.ownerId')
      .where('owner.userId = :userId', { userId })
      .orderBy('request.createdAt', 'DESC')
      .addOrderBy('request.id', 'DESC')
      .getMany();
  }

  async getOne(id: number, userId: number, role: AppRole) {
    const query = this.requests
      .createQueryBuilder('request')
      .innerJoin('request.estate', 'estate')
      .where('request.id = :id', { id });

    if (role === 'Estate Owner') {
      query
        .innerJoin(EstateOwnerEntity, 'owner', 'owner.id = estate.ownerId')
        .andWhere('owner.userId = :userId', { userId });
    } else if (role === 'Estate Manager') {
      query
        .innerJoin(EstateManager, 'manager', 'manager.estate_id = estate.id')
        .innerJoin('manager.employee', 'employee')
        .andWhere('employee.user_id = :userId', { userId })
        .andWhere('employee.is_active = true')
        .andWhere('(estate.managerId IS NULL OR estate.managerId = manager.id)');
    } else {
      throw new ForbiddenException('Only estate owners and managers can view this request.');
    }

    const request = await query.getOne();
    if (!request) throw new NotFoundException('Collection request not found.');
    return request;
  }

  async deletePending(id: number, userId: number, role: AppRole) {
    if (role !== 'Estate Owner') {
      throw new ForbiddenException('Only estate owners can delete collection requests.');
    }

    const ownedEstates = this.estates.createQueryBuilder('estate')
      .select('estate.id')
      .innerJoin(EstateOwnerEntity, 'owner', 'owner.id = estate.ownerId')
      .where('owner.userId = :userId', { userId });

    const result = await this.requests.createQueryBuilder()
      .delete()
      .where('id = :id AND status = :status', { id, status: 'open' })
      .andWhere(`estate_id IN (${ownedEstates.getQuery()})`, ownedEstates.getParameters())
      .execute();
    if (!result.affected) {
      throw new NotFoundException('This request is no longer available to delete.');
    }
    return { id };
  }

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
