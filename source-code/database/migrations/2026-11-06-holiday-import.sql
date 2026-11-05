-- Attendance-Leave-Addendum §4.5 — Sri Lanka holidays imported from Google's public calendar.
--   • holiday_import_skips: events the Administrator unticked, so a re-sync doesn't offer them again
--   (holidays.source / external_uid / imported_at came with 2026-11-06-holiday-approvals.sql)
BEGIN;

CREATE TABLE IF NOT EXISTS holiday_import_skips (
    id         SERIAL PRIMARY KEY,
    uid        VARCHAR(200) NOT NULL UNIQUE,   -- the iCal UID
    year       INTEGER NOT NULL,
    name       VARCHAR(100) NOT NULL,
    date       DATE NOT NULL,
    skipped_by VARCHAR(100),
    skipped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_holiday_import_skips_year ON holiday_import_skips(year);

COMMIT;
