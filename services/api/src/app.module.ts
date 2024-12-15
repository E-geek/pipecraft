import * as path from "node:path";

import { Module } from '@nestjs/common';
import {ConfigModule, ConfigService} from "@nestjs/config";
import { TypeOrmModule } from '@nestjs/typeorm';

import config from './config/config';
import { validationSchema } from './config/validation';
import { PingModule } from './ping/ping.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        // root of package
        path.join(__dirname, '..', '..', '.env'),
        path.join(__dirname, '..', '..', `${process.env.NODE_ENV}.env`),
        // monorepo root
        path.join(__dirname, '..', '..', '..', '..', '.env'),
        path.join(__dirname, '..', '..','..', '..', `${process.env.NODE_ENV}.env`),
      ],
      load: [config],
      isGlobal: true,
      validationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.user'),
        password: configService.get('database.pass'),
        database: configService.get('database.db'),
        entities: [`${__dirname}/db//entities/*.ts`],
        migrations: [`${__dirname}/db/migrations/*.ts`],
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    PingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
