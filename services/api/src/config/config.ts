import * as process from 'node:process';
import * as path from 'node:path';

export default () => ({
  port: parseInt(process.env.PORT ?? '8580', 10),
  appSecret: process.env.LOCAL_SECRET ?? '',
});


export const dotEnvPath = [
  // root of package
  path.join(__dirname, '..', '..', `.env.${process.env.NODE_ENV}`),
  path.join(__dirname, '..', '..', '.env'),
  // monorepo root
  path.join(__dirname, '..', '..', '..', '..', `.env.${process.env.NODE_ENV}`),
  path.join(__dirname, '..', '..', '..', '..', '.env'),
];
