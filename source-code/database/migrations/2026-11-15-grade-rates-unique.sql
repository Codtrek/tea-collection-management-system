-- Grade-Rates-Addendum — one grade-rate version per effective date. Versions are never edited; a
-- second version on the same date would make "the rate in force on a date" ambiguous and could
-- reprice leaf already delivered. (The service also refuses back-dated versions.)
BEGIN;

ALTER TABLE grade_rates DROP CONSTRAINT IF EXISTS grade_rates_effective_date_key;
ALTER TABLE grade_rates ADD CONSTRAINT grade_rates_effective_date_key UNIQUE (effective_date);

COMMIT;
