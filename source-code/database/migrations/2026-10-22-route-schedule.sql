-- ════════════════════════════════════════════════════════════════
-- Route schedule — routes run on set weekdays (+ one-date overrides), not daily
-- Spec: docs/specs/Route-Schedule-Addendum.md
--
-- Targeted migration (NOT a reset). Hand-applied against the dev schema, e.g.
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f source-code/database/migrations/2026-10-22-route-schedule.sql
-- init.sql carries the same end state for fresh databases.
-- Idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING), one transaction.
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Weekly pattern: one row per (route, weekday); 0 = Sunday … 6 = Saturday ──
CREATE TABLE IF NOT EXISTS route_schedule_weekdays (
    route_id INTEGER  NOT NULL REFERENCES routes(id),
    weekday  SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    PRIMARY KEY (route_id, weekday)
);

-- ─── One-date exceptions. A move = CANCEL(old) + ADD(new) sharing move_group ──
CREATE TABLE IF NOT EXISTS route_schedule_overrides (
    id         SERIAL PRIMARY KEY,
    route_id   INTEGER NOT NULL REFERENCES routes(id),
    date       DATE NOT NULL,
    kind       VARCHAR(6) NOT NULL CHECK (kind IN ('ADD', 'CANCEL')),
    reason     TEXT NOT NULL,
    move_group UUID,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (route_id, date)
);
CREATE INDEX IF NOT EXISTS idx_route_overrides_route_date ON route_schedule_overrides (route_id, date);

-- ─── Backfill: existing routes keep running every day until an officer sets a pattern ──
INSERT INTO route_schedule_weekdays (route_id, weekday)
SELECT r.id, d.weekday
FROM routes r
CROSS JOIN generate_series(0, 6) AS d(weekday)
ON CONFLICT DO NOTHING;

COMMIT;
