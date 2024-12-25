// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom

import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

import { TestDBSeeder } from './tool/test-db-seeder';
import { dotEnvPath } from './config/config';
import dbConfig from './config/db.config';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

config({
  path: dotEnvPath
});
const dataSourceConfig = dbConfig() as PostgresConnectionOptions;
const dbName = dataSourceConfig.database;

const recreateDatabase = async () => {
  console.log('⏳ Удаляем и создаем тестовую БД...');

  const adminClient = new Client({
    host: dataSourceConfig.host,
    port: dataSourceConfig.port,
    user: dataSourceConfig.username,
    password: dataSourceConfig.password,
    database: 'postgres', // Подключаемся к системной БД
  });

  try {
    await adminClient.connect();

    // Завершаем активные подключения к тестовой базе данных
    await adminClient.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
        AND pid <> pg_backend_pid();
    `);

    // Удаляем базу данных, если она существует
    await adminClient.query(`DROP DATABASE IF EXISTS ${dbName};`);

    // Создаем новую базу данных
    await adminClient.query(`CREATE DATABASE ${dbName};`);

    console.log('✅ БД успешно пересоздана.');
  } catch (error) {
    console.error('❌ Ошибка при пересоздании БД:', error);
    process.exit(1);
  } finally {
    await adminClient.end();
  }
};

const setupDatabase = async () => {
  const dataSource = new DataSource(dataSourceConfig);

  try {
    await dataSource.initialize();
    console.log('✅ Подключение к БД успешно.');

    // Применяем миграции
    console.log('⏳ Применяем миграции...');
    await dataSource.runMigrations();

    // Заполняем тестовыми данными
    console.log('⏳ Заполняем тестовыми данными...');
    const seeder = new TestDBSeeder(dataSource);
    await seeder.seed();

    console.log('✅ БД готова к тестам.');
  } catch (error) {
    console.error('❌ Ошибка при подготовке БД:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
};

export default async() => {
  console.log('⏳ Подготовка окружения...');
  await recreateDatabase();
  await setupDatabase();
};
