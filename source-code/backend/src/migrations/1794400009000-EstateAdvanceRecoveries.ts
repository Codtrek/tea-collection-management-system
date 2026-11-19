import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converted from source-code/database/migrations/2026-11-03-estate-advance-recoveries.sql (hand-applied before dev
 * moved to TypeORM migrations). Same SQL without BEGIN/COMMIT — TypeORM wraps each
 * migration in a transaction. Guarded (IF NOT EXISTS / ON CONFLICT), so a database that
 * already ran the raw file is safe.
 */
export class EstateAdvanceRecoveries1794400009000 implements MigrationInterface {
  name = 'EstateAdvanceRecoveries1794400009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- Estate-Owner-Advances-Addendum §3 — which settlement recovered how much of an estate advance.
-- Same model as salary advances' advance_recoveries: remaining = amount − Σ recoveries, so one
-- advance can later be recovered across several settlements (carry-forward / installments, §4).

CREATE TABLE IF NOT EXISTS estate_advance_recoveries (
    id            SERIAL PRIMARY KEY,
    advance_id    VARCHAR(20) NOT NULL REFERENCES estate_advances(id),
    settlement_id VARCHAR(20) NOT NULL REFERENCES settlements(id),
    amount        DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    recovered_at  TIMESTAMP NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE (advance_id, settlement_id)
);
CREATE INDEX IF NOT EXISTS estate_advance_recoveries_advance_idx ON estate_advance_recoveries (advance_id);

-- Backfill the one deducted advance whose settlement is known: Mount Rest's Rs 40,000
-- (EADV-2026-0022) was taken by its June 2026 settlement (advance_deduction 40,000).
INSERT INTO estate_advance_recoveries (advance_id, settlement_id, amount, recovered_at)
SELECT a.id, s.id, a.amount, COALESCE(s.processed_on, NOW())
FROM estate_advances a JOIN settlements s ON s.id = 'SET-2026-06-003'
WHERE a.id = 'EADV-2026-0022' AND a.status = 'deducted'
ON CONFLICT (advance_id, settlement_id) DO NOTHING;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS estate_advance_recoveries`);
  }
}
