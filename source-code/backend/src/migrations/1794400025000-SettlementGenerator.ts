import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Settlement generator (Settlement-Addendum). Written as a TypeORM migration from the start;
 * init.sql carries the same change at its end.
 *
 *  • settlements: a 'legacy' status (seeded snapshots kept read-only, never processed); the
 *    calculation the generator made (`calculation`, frozen when processed); the gross it priced
 *    (rate periods make kg × one rate wrong); payout method and an exclusion reason; who
 *    prepared it. One live settlement per estate per period.
 *  • settlement_delivery_exclusions: a delivery left out of a month, with the reason. It rolls
 *    into the next month the estate is settled for.
 *
 * Structure only — no row is relabelled here. Which seeded rows are legacy is the seed's
 * business, never a migration's.
 */
export class SettlementGenerator1794400025000 implements MigrationInterface {
  name = 'SettlementGenerator1794400025000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
ALTER TABLE settlements DROP CONSTRAINT IF EXISTS settlements_status_check;
ALTER TABLE settlements ADD CONSTRAINT settlements_status_check
    CHECK (status IN ('pending', 'processed', 'legacy'));

ALTER TABLE settlements
    ADD COLUMN IF NOT EXISTS legacy_reason   TEXT,
    ADD COLUMN IF NOT EXISTS gross_amount    DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS calculation     JSONB,
    ADD COLUMN IF NOT EXISTS payout_method   VARCHAR(4),
    ADD COLUMN IF NOT EXISTS excluded_reason TEXT,
    ADD COLUMN IF NOT EXISTS prepared_by     VARCHAR(100),
    ADD COLUMN IF NOT EXISTS prepared_at     TIMESTAMPTZ;

ALTER TABLE settlements DROP CONSTRAINT IF EXISTS settlements_payout_method_check;
ALTER TABLE settlements ADD CONSTRAINT settlements_payout_method_check
    CHECK (payout_method IN ('bank', 'cash'));

CREATE UNIQUE INDEX IF NOT EXISTS settlements_estate_period_live_key
    ON settlements (estate_id, period) WHERE status <> 'legacy';

CREATE TABLE IF NOT EXISTS settlement_delivery_exclusions (
    id           SERIAL PRIMARY KEY,
    delivery_id  VARCHAR(20) NOT NULL UNIQUE
        CONSTRAINT settlement_delivery_exclusions_delivery_id_fkey
        REFERENCES tea_collection_records(id),
    month        VARCHAR(7) NOT NULL
        CONSTRAINT settlement_delivery_exclusions_month_check CHECK (month ~ '^[0-9]{4}-[0-9]{2}$'),
    reason       TEXT NOT NULL,
    auto         BOOLEAN NOT NULL DEFAULT FALSE,
    excluded_by  VARCHAR(100) NOT NULL,
    excluded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DROP TABLE IF EXISTS settlement_delivery_exclusions;
DROP INDEX IF EXISTS settlements_estate_period_live_key;
ALTER TABLE settlements DROP CONSTRAINT IF EXISTS settlements_payout_method_check;
ALTER TABLE settlements
    DROP COLUMN IF EXISTS legacy_reason,
    DROP COLUMN IF EXISTS gross_amount,
    DROP COLUMN IF EXISTS calculation,
    DROP COLUMN IF EXISTS payout_method,
    DROP COLUMN IF EXISTS excluded_reason,
    DROP COLUMN IF EXISTS prepared_by,
    DROP COLUMN IF EXISTS prepared_at;
ALTER TABLE settlements DROP CONSTRAINT IF EXISTS settlements_status_check;
ALTER TABLE settlements ADD CONSTRAINT settlements_status_check
    CHECK (status IN ('pending', 'processed'));
`);
  }
}
