import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1734328002181 implements MigrationInterface {
    name = 'Migrations1734328002181'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "piece" ("pid" BIGSERIAL NOT NULL, "outputId" bigint NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "data" jsonb NOT NULL, CONSTRAINT "PK_cea7a7ca23b96cd3dc071087bc1" PRIMARY KEY ("pid")); COMMENT ON COLUMN "piece"."outputId" IS 'ID of source piece (miner/factory/etc id)'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "piece"`);
    }

}
