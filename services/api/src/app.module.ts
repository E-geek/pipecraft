import * as path from 'node:path';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import config from './config/config';
import dbConfig from './config/db.config';
import { validationSchema } from './config/validation';
import { PingModule } from './ping/ping.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        // root of package
        path.join(__dirname, '..', '.env'),
        path.join(__dirname, '..', `${process.env.NODE_ENV}.env`),
        // monorepo root
        path.join(__dirname, '..', '..', '..', '.env'),
        path.join(__dirname, '..', '..', '..', `${process.env.NODE_ENV}.env`),
      ],
      load: [ config, dbConfig ],
      isGlobal: true,
      validationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ ConfigModule ],
      inject: [ ConfigService ],
      useFactory: (configService :ConfigService) => ({ ...configService.get('database') }),
    }),
    PingModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
}
