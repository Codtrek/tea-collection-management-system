import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converted from source-code/database/migrations/2026-11-15-stock-unit-cost.sql (hand-applied before dev
 * moved to TypeORM migrations). Same SQL without BEGIN/COMMIT — TypeORM wraps each
 * migration in a transaction. Guarded (IF NOT EXISTS / ON CONFLICT), so a database that
 * already ran the raw file is safe.
 */
export class StockUnitCost1794400018000 implements MigrationInterface {
  name = 'StockUnitCost1794400018000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- Finance-Reports-Addendum §5 — what the factory paid for fertilizer stock. An Incoming movement
-- records its unit cost (Rs per kg); the Expense report counts quantity × unit cost as
-- "Fertilizer stock purchases" on the movement date. Stock received before this column existed
-- has no cost (NULL) and is reported as "stock-ins without a cost", never guessed at.

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2)
    CHECK (unit_cost IS NULL OR unit_cost > 0);
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE stock_movements DROP COLUMN IF EXISTS unit_cost`,
    );
  }
}
