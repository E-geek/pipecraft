import * as process from 'node:process';
import { registerAs } from '@nestjs/config';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

declare global {
  interface BigInt {
    toJSON() :number;
  }
}

BigInt.prototype.toJSON = function () { return this.toString(); };

export default registerAs('database', () => {
  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    database: process.env.DB_NAME ?? 'pipecraft',
    username: process.env.DB_USER ?? '',
    password: process.env.DB_PASS ?? '',
    entities: [ `${__dirname}/../db/entities/*.{ts,js}` ],
    migrations: [ `${__dirname}/../db/migrations/*.{ts,js}` ],
    autoLoadEntities: true,
    migrationsRun: true,
    synchronize: false,
    logging: 'all',
  } as PostgresConnectionOptions;
});
