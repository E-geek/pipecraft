import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1734328144541 implements MigrationInterface {
    name = 'Migrations1734328144541';

    public async up(queryRunner :QueryRunner) :Promise<void> {
        await queryRunner.query('CREATE UNIQUE INDEX "IDX_36cd6fd23efa7f78ff7d798259" ON "piece" ("pid", "outputId") ');
    }

    public async down(queryRunner :QueryRunner) :Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_36cd6fd23efa7f78ff7d798259"');
    }

}
