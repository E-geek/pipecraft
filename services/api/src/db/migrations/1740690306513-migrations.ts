import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1740690306513 implements MigrationInterface {
    name = 'Migrations1740690306513';

    public async up(queryRunner :QueryRunner) :Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "run_report" DROP CONSTRAINT "FK_30f462c5552f32cb777878d1fa1"
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report" DROP CONSTRAINT "REL_30f462c5552f32cb777878d1fa"
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report" DROP COLUMN "piecePid"
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report"
            ADD "pids" bigint array
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report"
            ADD "level" smallint NOT NULL DEFAULT '2'
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report"
            ADD "message" text NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report"
            ADD "buildingBid" bigint
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "run_report"."buildingBid" IS 'id of the building'
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report"
            ADD CONSTRAINT "FK_eb3cf48241412815e2c2a2f57ce" FOREIGN KEY ("buildingBid") REFERENCES "building"("bid") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner :QueryRunner) :Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "run_report" DROP CONSTRAINT "FK_eb3cf48241412815e2c2a2f57ce"
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "run_report"."buildingBid" IS 'id of the building'
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report" DROP COLUMN "buildingBid"
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report" DROP COLUMN "message"
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report" DROP COLUMN "level"
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report" DROP COLUMN "pids"
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report"
            ADD "piecePid" bigint
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report"
            ADD CONSTRAINT "REL_30f462c5552f32cb777878d1fa" UNIQUE ("piecePid")
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report"
            ADD CONSTRAINT "FK_30f462c5552f32cb777878d1fa1" FOREIGN KEY ("piecePid") REFERENCES "piece"("pid") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

}
