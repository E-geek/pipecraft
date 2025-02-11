// setup before all suites
import { Client } from 'pg';
import { DataSource } from 'typeorm';

import { TestDBSeeder } from './test/test-db-seeder';
import { getTestDBConf } from './test/db.conf';

const dbConfig = getTestDBConf();
const dbName = dbConfig.database;

const recreateDatabase = async () => {
  console.log('⏳ Удаляем и создаем тестовую БД...');

  const adminClient = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.username,
    password: dbConfig.password,
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
  const dataSource = new DataSource(dbConfig);

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
