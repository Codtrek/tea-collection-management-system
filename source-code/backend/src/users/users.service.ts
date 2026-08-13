import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, TreeRepositoryNotSupportedError } from 'typeorm';
import { FactoryEmployee } from './factory-employee.entity';
import { EstateOwner } from './estate-owner.entity';
import { User } from './user.entity';

export interface UserProfile {
  name: string;
  factory: string;
}

export interface EstateOwnerProfile {
  name: string;
  estate: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(FactoryEmployee)
    private readonly factoryEmployeesRepository: Repository<FactoryEmployee>,
    @InjectRepository(EstateOwner)
    private readonly estateOwnersRepository: Repository<EstateOwner>,
  ) {}

  findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone } });
  }

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  /** Name + factory affiliation for a factory-side user (Administrator/Officer/Manager). */
  async getProfile(userId: number): Promise<UserProfile | null> {
    const employee = await this.factoryEmployeesRepository.findOne({
      where: { user_id: userId },
      relations: { factory: true },
    });
    if (!employee) return null;
    return { name: employee.name, factory: employee.factory.name };
  }

  async getEstateOwnerProfile(userId: number): Promise<EstateOwnerProfile | null> {
    const estateOwner = await this.estateOwnersRepository.findOne({
      where: { user_id: userId },
      relations: { estate: true },
    });
    if (!estateOwner) return null;
    const estate = estateOwner.estate[0];
    if (!estate) return null;
    return { name: estateOwner.name, estate: estate.name };
  }
}
