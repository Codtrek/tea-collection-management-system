-- ════════════════════════════════════════════════════════════════
-- Agent Dispatch / Absence Cover / Multi-grade deliveries
-- Spec: docs/specs/Collection-Agent-Dispatch-Addendum.md
--
-- Targeted migration (NOT a reset). Hand-applied against the dev schema, e.g.
--   PGOPTIONS='-c search_path=tea_authslice' psql -d nestjs_db -v ON_ERROR_STOP=1 \
--     -f source-code/database/migrations/2026-10-09-agent-dispatch.sql
-- init.sql carries the same end state for fresh databases.
-- Idempotent where practical (IF NOT EXISTS / guarded DO blocks), one transaction.
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Route assignments (requests go to a ROUTE; a resolver finds the agent) ──
CREATE TABLE IF NOT EXISTS route_assignments (
    id                   SERIAL PRIMARY KEY,
    route_id             INTEGER NOT NULL REFERENCES routes(id),
    agent_id             INTEGER NOT NULL REFERENCES collection_agents(id),
    type                 VARCHAR(10) NOT NULL
        CHECK (type IN ('PERMANENT', 'COVER')),
    status               VARCHAR(10) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACTIVE', 'DECLINED', 'EXPIRED', 'CANCELLED')),
    valid_from           DATE NOT NULL,
    valid_to             DATE, -- null = open-ended (permanent)
    created_by           VARCHAR(100) NOT NULL,
    accepted_at          TIMESTAMP,
    responded_at         TIMESTAMP,
    expires_at           TIMESTAMP, -- PENDING covers lapse here
    reason               TEXT,
    covers_assignment_id INTEGER REFERENCES route_assignments(id), -- the PERMANENT being covered
    stop_scope           JSONB, -- hook: stop-level overrides for splitting a route (not used yet)
    created_at           TIMESTAMP DEFAULT NOW(),
    CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

-- One live (open-ended) permanent assignment per route. A replaced permanent keeps
-- status ACTIVE but gets a valid_to, so history stays date-resolvable.
CREATE UNIQUE INDEX IF NOT EXISTS uq_route_one_open_permanent
    ON route_assignments (route_id)
    WHERE type = 'PERMANENT' AND status = 'ACTIVE' AND valid_to IS NULL;
CREATE INDEX IF NOT EXISTS idx_route_assignments_route ON route_assignments (route_id, valid_from);
CREATE INDEX IF NOT EXISTS idx_route_assignments_agent ON route_assignments (agent_id, status);

-- ─── Neighbouring routes (primary proximity signal; stored symmetric) ───────
CREATE TABLE IF NOT EXISTS route_neighbours (
    route_id           INTEGER NOT NULL REFERENCES routes(id),
    neighbour_route_id INTEGER NOT NULL REFERENCES routes(id),
    PRIMARY KEY (route_id, neighbour_route_id),
    CHECK (route_id <> neighbour_route_id)
);

-- ─── Per-agent per-day availability + shift ─────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_day_status (
    agent_id         INTEGER NOT NULL REFERENCES collection_agents(id),
    day              DATE NOT NULL,
    status           VARCHAR(10) NOT NULL DEFAULT 'AVAILABLE'
        CHECK (status IN ('AVAILABLE', 'ABSENT')),
    source           VARCHAR(10) CHECK (source IN ('self', 'officer')),
    reason           TEXT,
    marked_by        VARCHAR(100),
    shift_started_at TIMESTAMPTZ,
    shift_ended_at   TIMESTAMPTZ,
    PRIMARY KEY (agent_id, day)
);

-- ─── Location pings (shift-only; 30-day retention enforced by a nightly job) ─
CREATE TABLE IF NOT EXISTS agent_location_pings (
    id          BIGSERIAL PRIMARY KEY,
    agent_id    INTEGER NOT NULL REFERENCES collection_agents(id),
    recorded_at TIMESTAMPTZ NOT NULL, -- device clock: when the fix was taken
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- server clock: when it arrived
    lat         DECIMAL(9,6) NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lng         DECIMAL(9,6) NOT NULL CHECK (lng BETWEEN -180 AND 180),
    accuracy_m  DECIMAL(8,2),
    source      VARCHAR(10) NOT NULL DEFAULT 'ping'
        CHECK (source IN ('ping', 'checkin'))
);
CREATE INDEX IF NOT EXISTS idx_pings_agent_time ON agent_location_pings (agent_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pings_recorded ON agent_location_pings (recorded_at);

-- ─── Push tokens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_push_tokens (
    token      VARCHAR(200) PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    platform   VARCHAR(10),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON device_push_tokens (user_id);

-- ─── Estate coordinates (map pins / route lines) ────────────────────────────
ALTER TABLE estates ADD COLUMN IF NOT EXISTS lat DECIMAL(9,6);
ALTER TABLE estates ADD COLUMN IF NOT EXISTS lng DECIMAL(9,6);

-- ─── Grade lines (grading is FACTORY-SIDE ONLY) ─────────────────────────────
-- One delivery → many lines, at most one per grade. The graded total is always
-- the SUM of lines — there is no stored total to drift. tea_collection_records
-- .weight_kg keeps meaning "estate weight" (agent-entered; mismatch check input).
CREATE TABLE IF NOT EXISTS delivery_grade_lines (
    id          SERIAL PRIMARY KEY,
    delivery_id VARCHAR(20) NOT NULL REFERENCES tea_collection_records(id) ON DELETE CASCADE,
    grade       VARCHAR(10) NOT NULL CHECK (grade IN ('super', 'normal')),
    weight_kg   DECIMAL(10,2) NOT NULL CHECK (weight_kg > 0),
    graded_by   VARCHAR(100) NOT NULL,
    graded_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (delivery_id, grade)
);
CREATE INDEX IF NOT EXISTS idx_grade_lines_delivery ON delivery_grade_lines (delivery_id);

-- Backfill: every already-graded record becomes one line, then the single-grade
-- column goes away (Ungraded == no lines). Guarded so a re-run is a no-op.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'tea_collection_records' AND column_name = 'grade'
    ) THEN
        INSERT INTO delivery_grade_lines (delivery_id, grade, weight_kg, graded_by, graded_at)
        SELECT id, grade, weight_kg, 'Migrated from record grade',
               COALESCE(last_updated_on, created_at, NOW())
        FROM tea_collection_records
        WHERE grade IN ('super', 'normal')
        ON CONFLICT (delivery_id, grade) DO NOTHING;

        ALTER TABLE tea_collection_records DROP COLUMN grade;
    END IF;
END $$;

-- ─── Backfill PERMANENT route assignments from delivery history ─────────────
-- There was never an agent↔route link; derive it. Process (route, agent) pairs
-- by descending delivery count; an agent takes at most one route as their own and
-- a route gets at most one permanent agent. Ties / leftovers are left for the seed
-- or an officer to assign explicitly (nothing is guessed beyond the evidence).
DO $$
DECLARE
    pair RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM route_assignments WHERE type = 'PERMANENT') THEN
        RETURN;
    END IF;
    FOR pair IN
        SELECT r.route_id, r.agent_id, COUNT(*) AS n, MIN(r.collection_date) AS first_day
        FROM tea_collection_records r
        WHERE r.route_id IS NOT NULL AND r.agent_id IS NOT NULL
        GROUP BY r.route_id, r.agent_id
        ORDER BY n DESC, r.agent_id
    LOOP
        -- a tie (several agents with the same top count on a route) is ambiguous: skip it
        IF EXISTS (
            SELECT 1 FROM (
                SELECT agent_id, COUNT(*) AS n
                FROM tea_collection_records
                WHERE route_id = pair.route_id AND agent_id IS NOT NULL
                GROUP BY agent_id
            ) t
            WHERE t.agent_id <> pair.agent_id AND t.n >= pair.n
        ) THEN
            CONTINUE;
        END IF;
        IF EXISTS (SELECT 1 FROM route_assignments WHERE type = 'PERMANENT' AND route_id = pair.route_id) THEN
            CONTINUE;
        END IF;
        IF EXISTS (SELECT 1 FROM route_assignments WHERE type = 'PERMANENT' AND agent_id = pair.agent_id) THEN
            CONTINUE;
        END IF;
        INSERT INTO route_assignments (route_id, agent_id, type, status, valid_from, created_by, accepted_at, reason)
        VALUES (pair.route_id, pair.agent_id, 'PERMANENT', 'ACTIVE', pair.first_day,
                'migration 2026-10-09', NOW(), 'Backfilled from delivery history');
    END LOOP;
END $$;

-- ─── Widen constraints ──────────────────────────────────────────────────────
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('delivery_confirmation', 'otp', 'complaint', 'fertilizer_approval',
                     'payment_update', 'collection_complete', 'no_agents',
                     'cover_request', 'cover_response', 'missed_checkin', 'route_reassigned',
                     'exception_request'));

ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_check
    CHECK (role IN ('Administrator', 'Officer', 'Manager', 'ReceivingOfficer'));

-- ─── Permissions: new `dispatch` module (data-driven, ADM-02) ───────────────
-- view = see the board · edit = mark absent / send cover · approve = permanent reassignment.
-- ReceivingOfficer row is kept in data but DISABLED this round (alert deferred).
INSERT INTO role_permissions (role, module, level) VALUES
    ('Administrator',    'dispatch', 'approve'),
    ('Officer',          'dispatch', 'edit'),
    ('Manager',          'dispatch', 'approve'),
    ('ReceivingOfficer', 'dispatch', 'none')
ON CONFLICT (role, module) DO NOTHING;

-- ─── Dispatch settings (one key so ADM-03's settings map stays tidy) ────────
INSERT INTO system_settings (key, value, updated_by)
VALUES ('dispatch', '{"coverRequestTimeoutMin": 15, "shiftStartTime": "06:00"}'::jsonb, 'migration 2026-10-09')
ON CONFLICT (key) DO NOTHING;

COMMIT;
