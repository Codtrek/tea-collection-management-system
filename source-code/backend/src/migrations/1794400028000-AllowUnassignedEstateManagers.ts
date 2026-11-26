import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowUnassignedEstateManagers1794400028000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE tea_estate_managers ALTER COLUMN estate_id DROP NOT NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL rejects this rollback while any manager is unassigned.
    await queryRunner.query('ALTER TABLE tea_estate_managers ALTER COLUMN estate_id SET NOT NULL');
  }
}
