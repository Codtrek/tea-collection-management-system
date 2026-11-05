import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converted from source-code/database/migrations/2026-11-08-fertilizer-write-off.sql (hand-applied before dev
 * moved to TypeORM migrations). Same SQL without BEGIN/COMMIT — TypeORM wraps each
 * migration in a transaction. Guarded (IF NOT EXISTS / ON CONFLICT), so a database that
 * already ran the raw file is safe.
 */
export class FertilizerWriteOff1794400016000 implements MigrationInterface {
  name = 'FertilizerWriteOff1794400016000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- Fertilizer-Delivery-Addendum §5.2 — Write-off replaces "Mark Discarded".
-- Stock that leaves the books without going to anyone (expired, damaged, other) is its own
-- movement type, so it never reads as a dispatch. The batch quantity drops by the written-off
-- kg; \`fertilizer_batches.discarded\` stays for legacy rows only.

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_type_check;
ALTER TABLE stock_movements
    ADD CONSTRAINT stock_movements_type_check
    CHECK (type IN ('Incoming', 'Outgoing', 'Write-off'));

ALTER TABLE stock_movements
    ADD COLUMN IF NOT EXISTS write_off_reason VARCHAR(10)
        CHECK (write_off_reason IN ('expired', 'damaged', 'other'));

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_write_off_reason_required;
ALTER TABLE stock_movements
    ADD CONSTRAINT stock_movements_write_off_reason_required
    CHECK (type <> 'Write-off' OR write_off_reason IS NOT NULL);
`);
  }

  /** Refuses (the CHECK fails) while any Write-off movement exists — they'd lose their meaning. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_write_off_reason_required`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_movements DROP COLUMN IF EXISTS write_off_reason`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_type_check`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_type_check CHECK (type IN ('Incoming', 'Outgoing'))`,
    );
  }
}
