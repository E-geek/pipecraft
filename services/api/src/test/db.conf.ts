import { Writable } from '@pipecraft/types';
import { config } from 'dotenv';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

// noinspection ES6PreferShortImport
import { dotEnvPath } from '../config/config';
import dbConfig from '../config/db.config';
import { TestPrinter } from './TestPrinter';
import { Migrations1739299794578 } from './1739299794578-migrations';

config({
  path: dotEnvPath,
});
const dataSourceConfig = dbConfig() as PostgresConnectionOptions;

export const getTestDBConf = () => {
  const conf :Writable<PostgresConnectionOptions> = JSON.parse(JSON.stringify(dataSourceConfig));
  conf.entities = [ TestPrinter, ...(conf.entities as string[]) ];
  conf.logging = 'all';
  conf.migrations = [ Migrations1739299794578,  ...(conf.migrations as string[]) ];
  return conf;
};
