import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { FactoryEmployee } from './factory-employee.entity';
import { type DbRole, User } from './user.entity';
import { EstateEntity } from '../estates/estate.entity';
import { EstateOwnerEntity } from '../estates/estate-owner.entity';
import { EstateManager } from './estate-manager.entity';

export interface UserProfile {
  name: string;
  factory?: string;
  estate?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(FactoryEmployee)
    private readonly factoryEmployeesRepository: Repository<FactoryEmployee>,
    @InjectRepository(EstateOwnerEntity)
    private readonly estateOwnersRepository: Repository<EstateOwnerEntity>,
    @InjectRepository(EstateEntity)
    private readonly estatesRepository: Repository<EstateEntity>,
    @InjectRepository(EstateManager)
    private readonly estateManagersRepository: Repository<EstateManager>,
  ) {}

  findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone } });
  }

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  /** Sets a new password and clears the temporary-password flag. */
  async setPassword(userId: number, passwordHash: string): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      { password_hash: passwordHash, must_change_password: false },
    );
  }

  /** Stamp a successful login so ADM-02 can show a real "last login". */
  async markLogin(userId: number): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      { last_login_at: new Date() },
    );
  }

  /**
   * Provisions a login row for a non-portal user registered through the
   * portal (e.g. an estate owner via EST-02). No password is issued through
   * this flow — mobile login/reset is deferred to PLAN.md Phase 3, so a
   * random hash is stored to satisfy the schema in the meantime. Reuses the
   * existing row if this phone is already registered.
   */
  async createUser(phone: string, role: DbRole): Promise<User> {
    const existing = await this.findByPhone(phone);
    if (existing) return existing;
    const password_hash = await bcrypt.hash(
      randomBytes(24).toString('hex'),
      10,
    );
    const user = this.usersRepository.create({ phone, password_hash, role });
    return this.usersRepository.save(user);
  }

  findByNic(nic: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { nic } });
  }

  async createEstateOwner(
    name: string,
    phone: string,
    nic: string,
    password_hash: string,
  ): Promise<User> {
    return this.usersRepository.manager.transaction(async (manager) => {
      const user = manager.create(User, {
        name,
        phone,
        nic,
        password_hash,
        role: 'estate_owner',
      });
      const savedUser = await manager.save(user);

      await manager.save(EstateOwnerEntity, {
        userId: savedUser.id,
        name,
        contact: phone,
        nic,
      });

      return savedUser;
    });
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

  async getEstateOwnerProfile(userId: number): Promise<UserProfile | null> {
    const estateOwner = await this.estateOwnersRepository.findOne({
      where: { userId },
    });
    if (!estateOwner) return null;
    const estate = await this.estatesRepository.findOne({
      where: { ownerId: estateOwner.id },
    });
    if (!estate) return null;
    return { name: estateOwner.name, estate: estate.name };
  }
  async getEstateManagerProfile(userId: number): Promise<UserProfile | null> {
    const estateManager = await this.estateManagersRepository
      .createQueryBuilder('estateManager')
      .leftJoinAndSelect('estateManager.employee', 'employee')
      .leftJoinAndSelect('estateManager.estate', 'estate')
      .where('employee.user_id = :userId', { userId })
      .getOne();
    if (!estateManager) return null;
    if (!estateManager.employee || !estateManager.estate) return null;
    return {
      name: estateManager.employee.name,
      estate: estateManager.estate.name,
    };
  }
}
