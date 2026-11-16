import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converted from source-code/database/migrations/2026-11-15-item-prices.sql (hand-applied before dev
 * moved to TypeORM migrations). Same SQL without BEGIN/COMMIT — TypeORM wraps each
 * migration in a transaction. Guarded (IF NOT EXISTS / ON CONFLICT), so a database that
 * already ran the raw file is safe.
 */
export class ItemPrices1794400021000 implements MigrationInterface {
  name = 'ItemPrices1794400021000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- Administration-Addendum §5 (2026-11-15): Item Prices — ONE selling-price source for fertilizer
-- and other items given to estate owners. A price is set per unit (kg, or a bag of N kg);
-- rate_per_kg stays the derived per-kg price a request snapshots when approved (unchanged rule).
-- Versions carry a reason and a scheduled one can be cancelled before it starts.

ALTER TABLE fertilizer_item_prices
    ADD COLUMN IF NOT EXISTS unit           VARCHAR(3) NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'bag')),
    ADD COLUMN IF NOT EXISTS bag_size_kg    DECIMAL(8,2) CHECK (bag_size_kg IS NULL OR bag_size_kg > 0),
    ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS reason         TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at   TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancelled_by   VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cancel_reason  TEXT;
UPDATE fertilizer_item_prices SET price_per_unit = rate_per_kg WHERE price_per_unit IS NULL;
ALTER TABLE fertilizer_item_prices ALTER COLUMN price_per_unit SET NOT NULL;
ALTER TABLE fertilizer_item_prices DROP CONSTRAINT IF EXISTS fertilizer_item_prices_item_effective_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS fertilizer_item_prices_live_key
    ON fertilizer_item_prices (item, effective_date) WHERE cancelled_at IS NULL;

-- itemPrices: the Administrator sets prices; Officers (who approve requests) and the Manager view.
INSERT INTO role_permissions (role, module, level) VALUES
    ('Administrator',    'itemPrices', 'approve'),
    ('Officer',          'itemPrices', 'view'),
    ('Manager',          'itemPrices', 'view'),
    ('ReceivingOfficer', 'itemPrices', 'none')
ON CONFLICT (role, module) DO NOTHING;
`);
  }

  public down(): Promise<void> {
    return Promise.reject(
      new Error(
        'ItemPrices: can’t be reverted automatically — it backfills price_per_unit and replaces the item-price uniqueness with a live-versions index.',
      ),
    );
  }
}
