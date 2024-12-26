import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import config, { dotEnvPath } from './config/config';
import dbConfig from './config/db.config';
import { validationSchema } from './config/validation';
import { PingModule } from './ping/ping.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ManufactureModule } from './manufacture/manufacture.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: dotEnvPath,
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
    ManufactureModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
}
