import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1739299794578 implements MigrationInterface {
    name = 'Migrations1739299794578';

    public async up(queryRunner :QueryRunner) :Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "memory_test_printer" (
                "mid" BIGSERIAL NOT NULL,
                "bid" bigint NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "string" character varying(64) NOT NULL,
                "number" integer NOT NULL,
                CONSTRAINT "PK_754bcc953de77bc79a1d1540efd" PRIMARY KEY ("mid")
            );
            COMMENT ON COLUMN "memory_test_printer"."mid" IS 'id of the building';
            COMMENT ON COLUMN "memory_test_printer"."bid" IS 'id of the building'
        `);
    }

    public async down(queryRunner :QueryRunner) :Promise<void> {
        await queryRunner.query(`
            DROP TABLE "memory_test_printer"
        `);
    }

}
