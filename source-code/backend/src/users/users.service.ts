import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { FactoryEmployee } from './factory-employee.entity';
import { type DbRole, User } from './user.entity';

export interface UserProfile {
  name: string;
  factory: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(FactoryEmployee)
    private readonly factoryEmployeesRepository: Repository<FactoryEmployee>,
  ) {}

  findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone } });
  }

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
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

  /** Name + factory affiliation for a factory-side user (Administrator/Officer/Manager). */
  async getProfile(userId: number): Promise<UserProfile | null> {
    const employee = await this.factoryEmployeesRepository.findOne({
      where: { user_id: userId },
      relations: { factory: true },
    });
    if (!employee) return null;
    return { name: employee.name, factory: employee.factory.name };
  }
}
