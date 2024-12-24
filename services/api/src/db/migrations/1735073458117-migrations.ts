import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1735073458117 implements MigrationInterface {
    name = 'Migrations1735073458117'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "building_type" (
                "btid" BIGSERIAL NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "title" character varying(128) NOT NULL,
                "moduleId" character varying(256) NOT NULL,
                "meta" jsonb NOT NULL DEFAULT '{}',
                CONSTRAINT "PK_f6f1ba98aa4824a163cd99fbfca" PRIMARY KEY ("btid")
            );
            COMMENT ON COLUMN "building_type"."btid" IS 'type of the building';
            COMMENT ON COLUMN "building_type"."title" IS 'Title of the building type';
            COMMENT ON COLUMN "building_type"."moduleId" IS 'Module name of the building';
            COMMENT ON COLUMN "building_type"."meta" IS 'Meta for the building instance'
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "building_type" IS 'Type of building'
        `);
        await queryRunner.query(`
            CREATE TABLE "piece" (
                "pid" BIGSERIAL NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "data" jsonb NOT NULL,
                "fromBid" bigint NOT NULL,
                CONSTRAINT "PK_cea7a7ca23b96cd3dc071087bc1" PRIMARY KEY ("pid")
            );
            COMMENT ON COLUMN "piece"."pid" IS 'id and default ordering key';
            COMMENT ON COLUMN "piece"."fromBid" IS 'id of the building'
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_9398b29d2927c57824c82c986b" ON "piece" ("pid", "fromBid")
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "piece" IS 'Elementary data portion for processing'
        `);
        await queryRunner.query(`
            CREATE TABLE "run_report" (
                "rrid" BIGSERIAL NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "buildingRunConfigBrcid" bigint,
                "piecePid" bigint,
                CONSTRAINT "REL_30f462c5552f32cb777878d1fa" UNIQUE ("piecePid"),
                CONSTRAINT "PK_a17634691e30d0f5df5dd735e68" PRIMARY KEY ("rrid")
            );
            COMMENT ON COLUMN "run_report"."rrid" IS 'id and default ordering key';
            COMMENT ON COLUMN "run_report"."buildingRunConfigBrcid" IS 'id and default ordering key';
            COMMENT ON COLUMN "run_report"."piecePid" IS 'id and default ordering key'
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "run_report" IS 'Every piece has a context of creation. This is important data for debugging and auditing'
        `);
        await queryRunner.query(`
            CREATE TABLE "building_run_config" (
                "brcid" BIGSERIAL NOT NULL,
                "runConfig" jsonb NOT NULL DEFAULT '{}',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "buildingBid" bigint,
                CONSTRAINT "PK_c0dc1737171a753e6a5bad596f6" PRIMARY KEY ("brcid")
            );
            COMMENT ON COLUMN "building_run_config"."brcid" IS 'id and default ordering key';
            COMMENT ON COLUMN "building_run_config"."buildingBid" IS 'id of the building'
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "building_run_config" IS 'This table stores the run configuration for a building run'
        `);
        await queryRunner.query(`
            CREATE TABLE "peer" (
                "peerId" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "peerSecret" character varying(32) NOT NULL,
                "controlData" character varying(128) NOT NULL,
                "userAgent" character varying(128),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "userUid" uuid,
                CONSTRAINT "PK_256058e8c3ba429b01613039893" PRIMARY KEY ("peerId")
            );
            COMMENT ON COLUMN "peer"."peerId" IS 'peer id';
            COMMENT ON COLUMN "peer"."peerSecret" IS 'peer secret';
            COMMENT ON COLUMN "peer"."controlData" IS 'data for validation final check';
            COMMENT ON COLUMN "peer"."userAgent" IS 'least user agent';
            COMMENT ON COLUMN "peer"."userUid" IS 'user id'
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "peer" IS 'Peer for every user login'
        `);
        await queryRunner.query(`
            CREATE TABLE "user" (
                "uid" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying(128) NOT NULL,
                "password" bytea,
                "name" character varying(128) NOT NULL,
                "isVerified" boolean NOT NULL DEFAULT false,
                "meta" jsonb NOT NULL DEFAULT '{}',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"),
                CONSTRAINT "PK_df955cae05f17b2bcf5045cc021" PRIMARY KEY ("uid")
            );
            COMMENT ON COLUMN "user"."uid" IS 'user id';
            COMMENT ON COLUMN "user"."email" IS 'email as login';
            COMMENT ON COLUMN "user"."password" IS 'password hash';
            COMMENT ON COLUMN "user"."name" IS 'name of the user';
            COMMENT ON COLUMN "user"."isVerified" IS 'is user verified';
            COMMENT ON COLUMN "user"."meta" IS 'meta for the user'
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "user" IS 'User with permissions and roles'
        `);
        await queryRunner.query(`
            CREATE TABLE "building" (
                "bid" BIGSERIAL NOT NULL,
                "batchSize" character varying(32) NOT NULL DEFAULT '1',
                "meta" jsonb NOT NULL DEFAULT '{}',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "inputBid" bigint,
                "typeBtid" bigint NOT NULL,
                "ownerUid" uuid NOT NULL,
                CONSTRAINT "PK_3b1373b7454af86d505b7636f08" PRIMARY KEY ("bid")
            );
            COMMENT ON COLUMN "building"."bid" IS 'id of the building';
            COMMENT ON COLUMN "building"."batchSize" IS 'N parts, N% of ready parts, 0 or 0% - infinite';
            COMMENT ON COLUMN "building"."inputBid" IS 'id of the building';
            COMMENT ON COLUMN "building"."typeBtid" IS 'type of the building';
            COMMENT ON COLUMN "building"."ownerUid" IS 'user id'
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "building" IS 'Data of build: miner, factory, printer, etc...'
        `);
        await queryRunner.query(`
            CREATE TABLE "scheduler" (
                "sid" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "isActive" boolean NOT NULL DEFAULT true,
                "cron" character varying(64) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "buildingBid" bigint NOT NULL,
                CONSTRAINT "REL_4cf3e619b25ab0c482454a4d07" UNIQUE ("buildingBid"),
                CONSTRAINT "PK_9f40848eb98d2b1f79a11f8377f" PRIMARY KEY ("sid")
            );
            COMMENT ON COLUMN "scheduler"."sid" IS 'user id';
            COMMENT ON COLUMN "scheduler"."isActive" IS 'should works or not';
            COMMENT ON COLUMN "scheduler"."cron" IS 'cron string';
            COMMENT ON COLUMN "scheduler"."buildingBid" IS 'id of the building'
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_86a736b46de00c8bf814a26468" ON "scheduler" ("isActive")
            WHERE "isActive" = true
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "scheduler" IS 'Store all schedulers'
        `);
        await queryRunner.query(`
            CREATE TABLE "pipe_memory" (
                "pmid" BIGSERIAL NOT NULL,
                "firstCursor" bigint NOT NULL DEFAULT '-1',
                "lastCursor" bigint NOT NULL DEFAULT '-1',
                "ordering" character varying NOT NULL DEFAULT 'direct',
                "priority" smallint NOT NULL DEFAULT '10',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "reserved" bigint array NOT NULL DEFAULT '{}',
                "returnedRaw" bigint array NOT NULL DEFAULT '{}',
                "fromBid" bigint NOT NULL,
                "toBid" bigint NOT NULL,
                CONSTRAINT "PK_98e4dfe84422c14449d167cadf7" PRIMARY KEY ("pmid")
            );
            COMMENT ON COLUMN "pipe_memory"."pmid" IS 'id and default ordering key';
            COMMENT ON COLUMN "pipe_memory"."firstCursor" IS 'Minimum piece id which take to a process';
            COMMENT ON COLUMN "pipe_memory"."lastCursor" IS 'Maximum piece id which take to a process';
            COMMENT ON COLUMN "pipe_memory"."ordering" IS 'Ordering of getting pieces';
            COMMENT ON COLUMN "pipe_memory"."priority" IS 'Priority of the process, less is high like in linux, from -20 to 20';
            COMMENT ON COLUMN "pipe_memory"."reserved" IS 'Pieces hold for processing now';
            COMMENT ON COLUMN "pipe_memory"."returnedRaw" IS 'Pieces when process failed, crashed, or return the error pieces, format is [pieceId, attempts, pieceId, attempts, ...]';
            COMMENT ON COLUMN "pipe_memory"."fromBid" IS 'id of the building';
            COMMENT ON COLUMN "pipe_memory"."toBid" IS 'id of the building'
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "pipe_memory" IS 'Config for storing which pieces in the process and which pieces is done'
        `);
        await queryRunner.query(`
            ALTER TABLE "piece"
            ADD CONSTRAINT "FK_3178831a6eb2f5973890a2425cc" FOREIGN KEY ("fromBid") REFERENCES "building"("bid") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report"
            ADD CONSTRAINT "FK_ad0941276ac6e57115e67f2ff80" FOREIGN KEY ("buildingRunConfigBrcid") REFERENCES "building_run_config"("brcid") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report"
            ADD CONSTRAINT "FK_30f462c5552f32cb777878d1fa1" FOREIGN KEY ("piecePid") REFERENCES "piece"("pid") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "building_run_config"
            ADD CONSTRAINT "FK_cbdef4fbab1a25bdb20ad8c86f2" FOREIGN KEY ("buildingBid") REFERENCES "building"("bid") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "peer"
            ADD CONSTRAINT "FK_85b722ce710c00c88605c2b8fee" FOREIGN KEY ("userUid") REFERENCES "user"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "building"
            ADD CONSTRAINT "FK_cef3b6d85207f568aed67e01238" FOREIGN KEY ("inputBid") REFERENCES "building"("bid") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "building"
            ADD CONSTRAINT "FK_75180df432a694eb64ad6fffb2b" FOREIGN KEY ("typeBtid") REFERENCES "building_type"("btid") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "building"
            ADD CONSTRAINT "FK_1e6ec795647a3d8dc609d7bf520" FOREIGN KEY ("ownerUid") REFERENCES "user"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "scheduler"
            ADD CONSTRAINT "FK_4cf3e619b25ab0c482454a4d073" FOREIGN KEY ("buildingBid") REFERENCES "building"("bid") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "pipe_memory"
            ADD CONSTRAINT "FK_3450d3ca7062c460183defd703e" FOREIGN KEY ("fromBid") REFERENCES "building"("bid") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "pipe_memory"
            ADD CONSTRAINT "FK_0b5d8b00c6958dce814d7e08f81" FOREIGN KEY ("toBid") REFERENCES "building"("bid") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "pipe_memory" DROP CONSTRAINT "FK_0b5d8b00c6958dce814d7e08f81"
        `);
        await queryRunner.query(`
            ALTER TABLE "pipe_memory" DROP CONSTRAINT "FK_3450d3ca7062c460183defd703e"
        `);
        await queryRunner.query(`
            ALTER TABLE "scheduler" DROP CONSTRAINT "FK_4cf3e619b25ab0c482454a4d073"
        `);
        await queryRunner.query(`
            ALTER TABLE "building" DROP CONSTRAINT "FK_1e6ec795647a3d8dc609d7bf520"
        `);
        await queryRunner.query(`
            ALTER TABLE "building" DROP CONSTRAINT "FK_75180df432a694eb64ad6fffb2b"
        `);
        await queryRunner.query(`
            ALTER TABLE "building" DROP CONSTRAINT "FK_cef3b6d85207f568aed67e01238"
        `);
        await queryRunner.query(`
            ALTER TABLE "peer" DROP CONSTRAINT "FK_85b722ce710c00c88605c2b8fee"
        `);
        await queryRunner.query(`
            ALTER TABLE "building_run_config" DROP CONSTRAINT "FK_cbdef4fbab1a25bdb20ad8c86f2"
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report" DROP CONSTRAINT "FK_30f462c5552f32cb777878d1fa1"
        `);
        await queryRunner.query(`
            ALTER TABLE "run_report" DROP CONSTRAINT "FK_ad0941276ac6e57115e67f2ff80"
        `);
        await queryRunner.query(`
            ALTER TABLE "piece" DROP CONSTRAINT "FK_3178831a6eb2f5973890a2425cc"
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "pipe_memory" IS NULL
        `);
        await queryRunner.query(`
            DROP TABLE "pipe_memory"
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "scheduler" IS NULL
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_86a736b46de00c8bf814a26468"
        `);
        await queryRunner.query(`
            DROP TABLE "scheduler"
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "building" IS NULL
        `);
        await queryRunner.query(`
            DROP TABLE "building"
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "user" IS NULL
        `);
        await queryRunner.query(`
            DROP TABLE "user"
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "peer" IS NULL
        `);
        await queryRunner.query(`
            DROP TABLE "peer"
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "building_run_config" IS NULL
        `);
        await queryRunner.query(`
            DROP TABLE "building_run_config"
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "run_report" IS NULL
        `);
        await queryRunner.query(`
            DROP TABLE "run_report"
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "piece" IS NULL
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_9398b29d2927c57824c82c986b"
        `);
        await queryRunner.query(`
            DROP TABLE "piece"
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "building_type" IS NULL
        `);
        await queryRunner.query(`
            DROP TABLE "building_type"
        `);
    }

}
