import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'node:path';
import dbConfig from './db.config';
config({
  path: [
    // root of package
    path.join(__dirname, '..', '..', '.env'),
    path.join(__dirname, '..', '..', `${process.env.NODE_ENV}.env`),
    // monorepo root
    path.join(__dirname, '..', '..', '..', '..', '.env'),
    path.join(__dirname, '..', '..', '..', '..', `${process.env.NODE_ENV}.env`),
  ]
});

export default new DataSource({
  ...dbConfig(),
});
