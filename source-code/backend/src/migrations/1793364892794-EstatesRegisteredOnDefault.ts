import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Re-spells the `estates.registered_on` default so TypeORM's drift check matches it.
 *
 * `('now'::text)::date` is how PostgreSQL itself wrote CURRENT_DATE before v10.
 * It is evaluated on every insert, so behaviour is unchanged and no data is touched.
 * It is needed because TypeORM 1.1.0 lowercases function defaults on the entity
 * side, so it can never equal the uppercase `CURRENT_DATE` that Postgres reports,
 * and would flag this column as drifted forever.
 */
export class EstatesRegisteredOnDefault1793364892794 implements MigrationInterface {
  name = 'EstatesRegisteredOnDefault1793364892794';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "estates" ALTER COLUMN "registered_on" SET DEFAULT ('now'::text)::date`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "estates" ALTER COLUMN "registered_on" SET DEFAULT CURRENT_DATE`,
    );
  }
}
