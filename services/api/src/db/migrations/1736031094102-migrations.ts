import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1736031094102 implements MigrationInterface {
    name = 'Migrations1736031094102'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "manufacture" (
                "mid" BIGSERIAL NOT NULL,
                "title" character varying(128) NOT NULL DEFAULT 'New manufacture',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "ownerUid" uuid,
                CONSTRAINT "PK_373bc2ff293f2cf18cc7cb5ffb9" PRIMARY KEY ("mid")
            );
            COMMENT ON COLUMN "manufacture"."mid" IS 'id of the manufacture';
            COMMENT ON COLUMN "manufacture"."title" IS 'title of the manufacture';
            COMMENT ON COLUMN "manufacture"."ownerUid" IS 'user id'
        `);
        await queryRunner.query(`
            ALTER TABLE "scheduler"
            ADD "manufactureMid" bigint
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "scheduler"."manufactureMid" IS 'id of the manufacture'
        `);
        await queryRunner.query(`
            ALTER TABLE "building"
            ADD "manufactureMid" bigint
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "building"."manufactureMid" IS 'id of the manufacture'
        `);
        await queryRunner.query(`
            ALTER TABLE "pipe_memory"
            ADD "manufactureMid" bigint
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "pipe_memory"."manufactureMid" IS 'id of the manufacture'
        `);
        await queryRunner.query(`
            ALTER TABLE "manufacture"
            ADD CONSTRAINT "FK_a9c84c767da1f4a8ae3009dde3f" FOREIGN KEY ("ownerUid") REFERENCES "user"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "scheduler"
            ADD CONSTRAINT "FK_4647474caf7b001a84634f14407" FOREIGN KEY ("manufactureMid") REFERENCES "manufacture"("mid") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "building"
            ADD CONSTRAINT "FK_b016c69f3aa1c473a41d41028e2" FOREIGN KEY ("manufactureMid") REFERENCES "manufacture"("mid") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "pipe_memory"
            ADD CONSTRAINT "FK_3c679daac36299a789bbb0e6e74" FOREIGN KEY ("manufactureMid") REFERENCES "manufacture"("mid") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "pipe_memory" DROP CONSTRAINT "FK_3c679daac36299a789bbb0e6e74"
        `);
        await queryRunner.query(`
            ALTER TABLE "building" DROP CONSTRAINT "FK_b016c69f3aa1c473a41d41028e2"
        `);
        await queryRunner.query(`
            ALTER TABLE "scheduler" DROP CONSTRAINT "FK_4647474caf7b001a84634f14407"
        `);
        await queryRunner.query(`
            ALTER TABLE "manufacture" DROP CONSTRAINT "FK_a9c84c767da1f4a8ae3009dde3f"
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "pipe_memory"."manufactureMid" IS 'id of the manufacture'
        `);
        await queryRunner.query(`
            ALTER TABLE "pipe_memory" DROP COLUMN "manufactureMid"
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "building"."manufactureMid" IS 'id of the manufacture'
        `);
        await queryRunner.query(`
            ALTER TABLE "building" DROP COLUMN "manufactureMid"
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "scheduler"."manufactureMid" IS 'id of the manufacture'
        `);
        await queryRunner.query(`
            ALTER TABLE "scheduler" DROP COLUMN "manufactureMid"
        `);
        await queryRunner.query(`
            DROP TABLE "manufacture"
        `);
    }

}
