import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1739381654444 implements MigrationInterface {
    name = 'Migrations1739381654444';

    public async up(queryRunner :QueryRunner) :Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "pipe" DROP COLUMN "priority"
        `);
        await queryRunner.query(`
            ALTER TABLE "building"
            ADD "nice" smallint
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "building"."nice" IS 'Priority of the process, less is high like in linux, from -20 to 20'
        `);
        await queryRunner.query(`
            ALTER TABLE "manufacture"
            ADD "nice" smallint NOT NULL DEFAULT '10'
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "manufacture"."nice" IS 'Priority of the process, less is high like in linux, from -20 to 20'
        `);
        await queryRunner.query(`
            ALTER TABLE "manufacture"
            ALTER COLUMN "meta"
            SET DEFAULT '{"isSequential":true}'
        `);
    }

    public async down(queryRunner :QueryRunner) :Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "manufacture"
            ALTER COLUMN "meta"
            SET DEFAULT '{"sequenceRun": true}'
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "manufacture"."nice" IS 'Priority of the process, less is high like in linux, from -20 to 20'
        `);
        await queryRunner.query(`
            ALTER TABLE "manufacture" DROP COLUMN "nice"
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "building"."nice" IS 'Priority of the process, less is high like in linux, from -20 to 20'
        `);
        await queryRunner.query(`
            ALTER TABLE "building" DROP COLUMN "nice"
        `);
        await queryRunner.query(`
            ALTER TABLE "pipe"
            ADD "priority" smallint NOT NULL DEFAULT '10'
        `);
    }

}
