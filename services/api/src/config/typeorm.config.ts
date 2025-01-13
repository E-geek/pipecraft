import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import dbConfig from './db.config';
import { dotEnvPath } from './config';
config({
  path: dotEnvPath,
});

export default new DataSource({
  ...dbConfig(),
});
