import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1736543510961 implements MigrationInterface {
    name = 'Migrations1736543510961';

    public async up(queryRunner :QueryRunner) :Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "piece" DROP CONSTRAINT "FK_3178831a6eb2f5973890a2425cc"
        `);
        await queryRunner.query(`
            ALTER TABLE "piece"
            ADD CONSTRAINT "FK_3178831a6eb2f5973890a2425cc" FOREIGN KEY ("fromBid") REFERENCES "building"("bid") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    }

    public async down(queryRunner :QueryRunner) :Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "piece" DROP CONSTRAINT "FK_3178831a6eb2f5973890a2425cc"
        `);
        await queryRunner.query(`
            ALTER TABLE "piece"
            ADD CONSTRAINT "FK_3178831a6eb2f5973890a2425cc" FOREIGN KEY ("fromBid") REFERENCES "building"("bid") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

}
