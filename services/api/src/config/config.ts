import * as process from 'node:process';

export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    db: process.env.DB_NAME ?? '',
    user: process.env.DB_USER ?? '',
    pass: process.env.DB_PASS ?? '',
  }
});
