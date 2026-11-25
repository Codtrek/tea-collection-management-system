import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { SignOptions } from 'jsonwebtoken';
import { RolePermissionEntity } from '../admin/role-permission.entity';
import { AuditModule } from '../audit/audit.module';
import { CollectionAgentEntity } from '../dispatch/collection-agent.entity';
import { AgentDirectoryService } from '../dispatch/agent-directory.service';
import { EmployeeEntity } from '../employees/employee.entity';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { AgentJwtStrategy } from './agent-jwt.strategy';
import { AgentSessionInterceptor } from './agent-session.interceptor';
import { AuthController } from './auth.controller';
import { AuthMobileController } from './auth.mobile.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule,
    // lockout + password-change audit rows
    AuditModule,
    // Read-only binding so login/`/auth/me` can attach the role's permission
    // map (the AdminModule owns writes to this table).
    TypeOrmModule.forFeature([
      RolePermissionEntity,
      CollectionAgentEntity,
      EmployeeEntity,
      User,
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>(
            'JWT_EXPIRES_IN',
            '7d',
          ) as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController, AuthMobileController],
  providers: [
    AuthService,
    JwtStrategy,
    AgentJwtStrategy,
    AgentDirectoryService,
    // sliding 30-day agent sessions: renews a day-old agent token on a successful call
    { provide: APP_INTERCEPTOR, useClass: AgentSessionInterceptor },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
