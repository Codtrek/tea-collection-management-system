import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Re-spells two more CURRENT_DATE defaults so TypeORM's drift check matches them,
 * exactly as EstatesRegisteredOnDefault1793364892794 did for `estates.registered_on`:
 * `estate_documents.uploaded_on` and `stock_movements.movement_date`.
 *
 * `('now'::text)::date` is evaluated on every insert, so behaviour is unchanged
 * and no data is touched. TypeORM 1.1.0 lowercases function defaults on the
 * entity side, so it can never equal the uppercase `CURRENT_DATE` Postgres reports.
 */
export class CurrentDateDefaults1793370000000 implements MigrationInterface {
  name = 'CurrentDateDefaults1793370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "estate_documents" ALTER COLUMN "uploaded_on" SET DEFAULT ('now'::text)::date`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ALTER COLUMN "movement_date" SET DEFAULT ('now'::text)::date`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "estate_documents" ALTER COLUMN "uploaded_on" SET DEFAULT CURRENT_DATE`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ALTER COLUMN "movement_date" SET DEFAULT CURRENT_DATE`,
    );
  }
}
