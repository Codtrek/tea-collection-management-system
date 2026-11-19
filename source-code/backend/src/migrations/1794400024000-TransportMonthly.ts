import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converted from source-code/database/migrations/2026-11-15-transport-monthly.sql (hand-applied before dev
 * moved to TypeORM migrations). Same SQL without BEGIN/COMMIT — TypeORM wraps each
 * migration in a transaction. Guarded (IF NOT EXISTS / ON CONFLICT), so a database that
 * already ran the raw file is safe.
 */
export class TransportMonthly1794400024000 implements MigrationInterface {
  name = 'TransportMonthly1794400024000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- Administration-Addendum §4 (2026-11-15, updated): transport is a FIXED MONTHLY charge per estate.
-- An estate is charged once for a settlement month in which it delivered at least once; no
-- deliveries = no charge; self-delivery estates are exempt. A version applies from the first month
-- that starts on or after its effective date (versions start on the 1st of a month). The seeded
-- 42/km row never applied: it stays in history, marked so. What a settlement was charged is
-- frozen on the settlement when it is processed, so a later version never changes it.

ALTER TABLE transport_rates DROP CONSTRAINT IF EXISTS transport_rates_basis_check;
ALTER TABLE transport_rates ALTER COLUMN basis TYPE VARCHAR(11);
ALTER TABLE transport_rates ADD CONSTRAINT transport_rates_basis_check
    CHECK (basis IN ('per_km', 'per_kg', 'fixed_month'));
ALTER TABLE transport_rates ADD COLUMN IF NOT EXISTS never_applied BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE transport_rates
   SET never_applied = TRUE,
       cancelled_at  = COALESCE(cancelled_at, NOW()),
       cancelled_by  = COALESCE(cancelled_by, 'migration 2026-11-15'),
       cancel_reason = COALESCE(cancel_reason, 'Never applied — the basis was never confirmed')
 WHERE basis IN ('per_km', 'per_kg') AND basis_confirmed = FALSE;

ALTER TABLE settlements
    ADD COLUMN IF NOT EXISTS transport_status       VARCHAR(14)
        CHECK (transport_status IN ('charged', 'exempt', 'no_deliveries')),
    ADD COLUMN IF NOT EXISTS transport_charge       DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS transport_version_id   INTEGER REFERENCES transport_rates(id),
    ADD COLUMN IF NOT EXISTS transport_carried_in   DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS transport_carried_out  DECIMAL(10,2) NOT NULL DEFAULT 0;
`);
  }

  public down(): Promise<void> {
    return Promise.reject(
      new Error(
        'TransportMonthly: can’t be reverted automatically — it marks the seeded per-km transport rate never applied and cancelled.',
      ),
    );
  }
}
