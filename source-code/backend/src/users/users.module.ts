import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FactoryEmployee } from './factory-employee.entity';
import { Factory } from './factory.entity';
import { Estate } from './estate.entity';
import { EstateOwner } from './estate-owner.entity';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      FactoryEmployee,
      Factory,
      EstateOwner,
      Estate,
    ]),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
