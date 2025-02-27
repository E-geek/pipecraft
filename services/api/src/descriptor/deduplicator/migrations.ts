import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1739919632856 implements MigrationInterface {
    name = 'Migrations1739919632856';

    public async up(queryRunner :QueryRunner) :Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "memory_deduplicator" (
                "mid" BIGSERIAL NOT NULL,
                "bid" bigint NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "hash" character varying(64),
                "raw" text,
                CONSTRAINT "PK_73b4b600de9579b70fd4f74fc2a" PRIMARY KEY ("mid")
            );
            COMMENT ON COLUMN "memory_deduplicator"."mid" IS 'id of the building';
            COMMENT ON COLUMN "memory_deduplicator"."bid" IS 'id of the building'
        `);
    }

    public async down(queryRunner :QueryRunner) :Promise<void> {
        await queryRunner.query(`
            DROP TABLE "memory_deduplicator"
        `);
    }

}
