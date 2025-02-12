import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1739352148156 implements MigrationInterface {
    name = 'Migrations1739352148156';

    public async up(queryRunner :QueryRunner) :Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "manufacture"
            ADD "meta" jsonb NOT NULL DEFAULT '{"isSequential":true}'
        `);
    }

    public async down(queryRunner :QueryRunner) :Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "manufacture" DROP COLUMN "meta"
        `);
    }

}
