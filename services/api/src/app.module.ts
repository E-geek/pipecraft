import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Writable } from '@pipecraft/types';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import config, { dotEnvPath } from '@/config/config';
import dbConfig from '@/config/db.config';
import { validationSchema } from '@/config/validation';
import { PingModule } from '@/ping/ping.module';
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/users/users.module';
import { ManufactureModule } from '@/manufacture/manufacture.module';
import { BureauModule } from './bureau/bureau.module';
import { BureauService } from '@/bureau/bureau.service';

@Module({
  imports: [
    BureauModule.forRoot({ path: [
      `${__dirname}/descriptor/**/*.desc.[jt]s`,
    ] }),
    ConfigModule.forRoot({
      envFilePath: dotEnvPath,
      load: [ config, dbConfig ],
      isGlobal: true,
      validationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ ConfigModule, BureauModule ],
      inject: [ ConfigService, BureauService ],
      useFactory: (configService :ConfigService, bureauService :BureauService) => {
        const entities = bureauService.getEntities();
        const migrations = bureauService.getMigrations();
        const conf :Writable<PostgresConnectionOptions> = JSON.parse(JSON.stringify(configService.get('database')));
        conf.entities = [ ...(entities as string[]), ...(conf.entities as string[]) ];
        conf.migrations = [ ...(migrations as string[]), ...(conf.migrations as string[]) ];
        return { ...conf };
      },
    }),
    PingModule,
    AuthModule,
    UsersModule,
    ManufactureModule,
    BureauModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
}
