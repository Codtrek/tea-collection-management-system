import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeaWeightToCollectionRequests1794400027000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tea_collection_requests"
      ADD COLUMN "tea_weight_kg" numeric(10,2)
        CONSTRAINT "chk_collection_requests_tea_weight_kg"
        CHECK ("tea_weight_kg" > 0 AND "tea_weight_kg" <> 'NaN'::numeric)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tea_collection_requests" DROP COLUMN "tea_weight_kg"
    `);
  }
}
