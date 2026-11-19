-- Administration-Addendum §2–4 (2026-11-15): Factory Setup becomes real data.
--  • grade_rates: every version carries a reason; a SCHEDULED version can be cancelled before it
--    starts (kept, never deleted). One LIVE version per date.
--  • transport_rates: transport becomes effective-dated like grade rates. Seeded from the values the
--    old (unsaved) Transport tab showed, effective before the first delivery, basis NOT confirmed.
--  • factoryProfile: the factory's details and bank account (Administrator only, masked in the UI).
BEGIN;

ALTER TABLE grade_rates
    ADD COLUMN IF NOT EXISTS reason        TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancelled_by  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE grade_rates DROP CONSTRAINT IF EXISTS grade_rates_effective_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS grade_rates_live_effective_key
    ON grade_rates (effective_date) WHERE cancelled_at IS NULL;

CREATE TABLE IF NOT EXISTS transport_rates (
    id               SERIAL PRIMARY KEY,
    effective_date   DATE NOT NULL,
    basis            VARCHAR(6) NOT NULL CHECK (basis IN ('per_km', 'per_kg')),
    rate             DECIMAL(10,2) NOT NULL CHECK (rate >= 0),
    minimum_charge   DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (minimum_charge >= 0),
    -- the factory has confirmed this is how it charges; until then nothing calculates with it
    basis_confirmed  BOOLEAN NOT NULL DEFAULT FALSE,
    reason           TEXT,
    set_by           VARCHAR(100) NOT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    cancelled_at     TIMESTAMP,
    cancelled_by     VARCHAR(100),
    cancel_reason    TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS transport_rates_live_effective_key
    ON transport_rates (effective_date) WHERE cancelled_at IS NULL;

INSERT INTO transport_rates (effective_date, basis, rate, minimum_charge, basis_confirmed, reason, set_by)
SELECT DATE '2019-01-01', 'per_km', 42, 500, FALSE,
       'Values the Transport tab showed before rates were versioned (never saved); basis not confirmed',
       'migration 2026-11-15'
 WHERE NOT EXISTS (SELECT 1 FROM transport_rates);

INSERT INTO system_settings (key, value, updated_by)
VALUES ('factoryProfile',
        '{"name": "Nuwara Eliya Tea Factory", "registrationNo": "REG-TF-1998-0042", "address": "Kandapola Rd, Nuwara Eliya", "contact": "0522223344", "email": "info@harboost.lk", "bank": {"bank": "", "branch": "", "accountName": "", "accountNumber": ""}}'::jsonb,
        'migration 2026-11-15')
ON CONFLICT (key) DO NOTHING;

COMMIT;
