import { Writable } from '@pipecraft/types';
import { config } from 'dotenv';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { TestPrinter } from './TestPrinter';

import { dotEnvPath } from '../config/config';
import dbConfig from '../config/db.config';

config({
  path: dotEnvPath
});
const dataSourceConfig = dbConfig() as PostgresConnectionOptions;

export const getTestDBConf = () => {
  const conf :Writable<PostgresConnectionOptions> = JSON.parse(JSON.stringify(dataSourceConfig));
  conf.entities = [ TestPrinter, ...(conf.entities as string[]) ];
  return conf;
};
