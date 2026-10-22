-- ════════════════════════════════════════════════════════════════
-- Fertilizer delivery — request → review (FEFO commitment) → route-stop dispatch →
-- pickup → delivery / failure → check-in → redelivery, plus payments and owner notices.
-- Spec: docs/specs/Fertilizer-Delivery-Addendum.md
--
-- Targeted migration (NOT a reset). Apply AFTER 2026-10-22-route-schedule.sql:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f source-code/database/migrations/2026-10-22-fertilizer-delivery.sql
-- init.sql carries the same end state for fresh databases.
-- Idempotent (IF NOT EXISTS / ON CONFLICT / guarded updates), one transaction.
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Requests: new lifecycle + the columns the flow needs ──────────────────
ALTER TABLE fertilizer_requests
    ADD COLUMN IF NOT EXISTS order_ref          VARCHAR(30),
    ADD COLUMN IF NOT EXISTS route_id           INTEGER REFERENCES routes(id),
    ADD COLUMN IF NOT EXISTS payment_method     VARCHAR(10) NOT NULL DEFAULT 'deduct',
    ADD COLUMN IF NOT EXISTS decision_reason    TEXT,
    ADD COLUMN IF NOT EXISTS rate_per_kg        DECIMAL(8,2),
    ADD COLUMN IF NOT EXISTS price_id           INTEGER,
    ADD COLUMN IF NOT EXISTS delivered_qty_kg   DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cycle_failures     INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS manager_decided_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS manager_decided_on TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMP DEFAULT NOW();

ALTER TABLE fertilizer_requests DROP CONSTRAINT IF EXISTS fertilizer_requests_payment_method_check;
ALTER TABLE fertilizer_requests ADD CONSTRAINT fertilizer_requests_payment_method_check
    CHECK (payment_method IN ('deduct', 'cash', 'bank'));

-- Old → new status mapping (row counts at the time of writing: Submitted 4, Approved 5,
-- Dispatched 1, Rejected 1). The CHECK is dropped first so old and new values can coexist.
ALTER TABLE fertilizer_requests DROP CONSTRAINT IF EXISTS fertilizer_requests_status_check;
-- "Awaiting manager approval" is 25 characters; the column was VARCHAR(20).
ALTER TABLE fertilizer_requests ALTER COLUMN status TYPE VARCHAR(30);
ALTER TABLE fertilizer_requests ALTER COLUMN status SET DEFAULT 'Requested';

UPDATE fertilizer_requests SET status = 'Requested' WHERE status = 'Submitted';
-- Delivered stock already left; Partially Dispatched = delivered for what went out, the rest is
-- released (never "Picked up" — that would invent stock in transit).
UPDATE fertilizer_requests
   SET delivered_qty_kg = dispatched_qty_kg,
       status = 'Delivered'
 WHERE status IN ('Dispatched', 'Deducted', 'Partially Dispatched');

-- Route is auto-filled from the estate (each estate belongs to exactly one route).
UPDATE fertilizer_requests r
   SET route_id = e.route_id
  FROM estates e
 WHERE e.id = r.estate_id AND r.route_id IS NULL;

ALTER TABLE fertilizer_requests ADD CONSTRAINT fertilizer_requests_status_check
    CHECK (status IN ('Requested', 'Awaiting manager approval', 'Approved', 'Partially approved',
                      'Rejected', 'Ready for dispatch', 'Picked up', 'Out for delivery',
                      'Partially delivered', 'Delivered', 'Failed', 'Returned to factory',
                      'Rescheduled', 'Needs review', 'Cancelled'));

CREATE INDEX IF NOT EXISTS idx_fertilizer_requests_order ON fertilizer_requests(order_ref);

-- ─── Item prices (effective-dated; the rate is SNAPSHOTTED onto a request) ──
CREATE TABLE IF NOT EXISTS fertilizer_item_prices (
    id             SERIAL PRIMARY KEY,
    item           VARCHAR(100) NOT NULL,
    rate_per_kg    DECIMAL(8,2) NOT NULL CHECK (rate_per_kg >= 0),
    effective_date DATE NOT NULL,
    set_by         VARCHAR(100) NOT NULL,
    created_at     TIMESTAMP DEFAULT NOW(),
    UNIQUE (item, effective_date)
);

-- ─── FEFO allocations: which batch's stock is promised to which request ─────
-- Committed = Σ qty_kg of ACTIVE rows. 'picked' = handed to an agent (left on-hand);
-- 'released' = given back to general stock (cancel / reject / owner refused).
CREATE TABLE IF NOT EXISTS fertilizer_allocations (
    id         SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES fertilizer_requests(id),
    batch_id   INTEGER NOT NULL REFERENCES fertilizer_batches(id),
    qty_kg     DECIMAL(10,2) NOT NULL CHECK (qty_kg > 0),
    state      VARCHAR(10) NOT NULL DEFAULT 'active'
        CHECK (state IN ('active', 'picked', 'released')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fert_alloc_request ON fertilizer_allocations(request_id);
CREATE INDEX IF NOT EXISTS idx_fert_alloc_batch_state ON fertilizer_allocations(batch_id, state);

-- ─── Delivery attempts: the fertilizer flag on a route stop (one row per attempt) ──
CREATE TABLE IF NOT EXISTS fertilizer_deliveries (
    id                 SERIAL PRIMARY KEY,
    request_id         INTEGER NOT NULL REFERENCES fertilizer_requests(id),
    attempt_no         INTEGER NOT NULL,
    estate_id          INTEGER NOT NULL REFERENCES estates(id),
    route_id           INTEGER NOT NULL REFERENCES routes(id),
    scheduled_date     DATE NOT NULL,
    -- pickup: the officer's handover moves the stock; the agent's confirmation is evidence
    pickup_agent_id    INTEGER REFERENCES collection_agents(id),
    handover_qty_kg    DECIMAL(10,2),
    handover_by        VARCHAR(100),
    handover_at        TIMESTAMPTZ,
    agent_confirm_qty_kg DECIMAL(10,2),
    agent_confirmed_at TIMESTAMPTZ,                 -- device time
    pickup_mismatch    BOOLEAN NOT NULL DEFAULT FALSE,
    pickup_sync_key    VARCHAR(80) UNIQUE,
    out_for_delivery_at TIMESTAMPTZ,
    -- outcome at the estate
    outcome            VARCHAR(10) CHECK (outcome IN ('delivered', 'partial', 'failed')),
    delivered_qty_kg   DECIMAL(10,2),
    shortfall_reason   TEXT,
    owner_name         VARCHAR(100),
    owner_confirmed_at TIMESTAMPTZ,                 -- device time of the owner's tap
    photos             JSONB NOT NULL DEFAULT '[]', -- [{label, takenAt, takenBy, photoUrl?}]
    fail_reason        VARCHAR(20)
        CHECK (fail_reason IN ('owner_not_available', 'road_not_passable', 'owner_refused',
                               'wrong_estate', 'other')),
    fail_note          TEXT,
    recorded_at        TIMESTAMPTZ,                 -- device time of the outcome
    synced_at          TIMESTAMPTZ,                 -- server time it arrived
    outcome_sync_key   VARCHAR(80) UNIQUE,
    -- check-in of what came back
    checked_in_qty_kg  DECIMAL(10,2),
    checked_in_by      VARCHAR(100),
    checked_in_at      TIMESTAMPTZ,
    cancelled_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (request_id, attempt_no)
);
CREATE INDEX IF NOT EXISTS idx_fert_deliveries_route_date ON fertilizer_deliveries(route_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_fert_deliveries_agent ON fertilizer_deliveries(pickup_agent_id);

-- ─── Timeline: who did what, when, and why (append-only) ────────────────────
CREATE TABLE IF NOT EXISTS fertilizer_request_events (
    id          SERIAL PRIMARY KEY,
    request_id  INTEGER NOT NULL REFERENCES fertilizer_requests(id),
    at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_at   TIMESTAMPTZ,                        -- set when the agent's phone recorded it
    actor       VARCHAR(100) NOT NULL,
    actor_role  VARCHAR(30) NOT NULL,
    action      VARCHAR(80) NOT NULL,
    from_status VARCHAR(30),
    to_status   VARCHAR(30),
    note        TEXT
);
CREATE INDEX IF NOT EXISTS idx_fert_events_request ON fertilizer_request_events(request_id, at);

-- ─── Charges: one per DELIVERY now (qty delivered × snapshot rate) ──────────
ALTER TABLE fertilizer_charges ALTER COLUMN stock_movement_id DROP NOT NULL;
ALTER TABLE fertilizer_charges
    ADD COLUMN IF NOT EXISTS delivery_id    INTEGER UNIQUE REFERENCES fertilizer_deliveries(id),
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(10);

-- ─── Cash / bank payments recorded by an officer ────────────────────────────
CREATE TABLE IF NOT EXISTS fertilizer_payments (
    id          SERIAL PRIMARY KEY,
    request_id  INTEGER NOT NULL REFERENCES fertilizer_requests(id),
    estate_id   INTEGER NOT NULL REFERENCES estates(id),
    amount      DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    paid_on     DATE NOT NULL,
    method      VARCHAR(10) NOT NULL CHECK (method IN ('cash', 'bank')),
    reference   VARCHAR(100),
    recorded_by VARCHAR(100) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (method <> 'bank' OR reference IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_fert_payments_request ON fertilizer_payments(request_id);
CREATE INDEX IF NOT EXISTS idx_fert_payments_estate ON fertilizer_payments(estate_id);

-- ─── Owner notification outbox (same claim/sweep design as grading_notifications) ──
CREATE TABLE IF NOT EXISTS fertilizer_notifications (
    id               SERIAL PRIMARY KEY,
    request_id       INTEGER NOT NULL REFERENCES fertilizer_requests(id),
    kind             VARCHAR(20) NOT NULL
        CHECK (kind IN ('approved', 'partially_approved', 'rejected', 'dispatched',
                        'delivered', 'failed', 'cancelled')),
    status           VARCHAR(10) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled')),
    send_after       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attempts         INTEGER NOT NULL DEFAULT 0,
    last_error       TEXT,
    sent_at          TIMESTAMPTZ,
    device_delivered BOOLEAN,                       -- false = stored for the owner, no device to push to
    payload          JSONB NOT NULL DEFAULT '{}',
    dedupe_key       VARCHAR(80) NOT NULL UNIQUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fert_notifications_due ON fertilizer_notifications(status, send_after);

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('delivery_confirmation', 'otp', 'complaint',
                    'fertilizer_approval', 'payment_update',
                    'collection_complete', 'no_agents',
                    'cover_request', 'cover_response', 'missed_checkin',
                    'route_reassigned', 'exception_request',
                    'delivery_graded', 'grade_correction', 'fertilizer_update'));

-- ─── Settings + permissions ─────────────────────────────────────────────────
INSERT INTO system_settings (key, value, updated_by)
VALUES ('fertilizer', '{"managerApprovalAboveKg": 500, "maxDeliveryAttempts": 3}'::jsonb, 'migration')
ON CONFLICT (key) DO NOTHING;

-- fertilizerApproval        approve = approve / partially approve / reject a request
-- fertilizerManagerApproval approve = the second sign-off above managerApprovalAboveKg
-- Separate keys because `approve` implies `edit`; the Administrator audits (view).
INSERT INTO role_permissions (role, module, level) VALUES
    ('Administrator',    'fertilizerApproval',        'view'),
    ('Officer',          'fertilizerApproval',        'approve'),
    ('Manager',          'fertilizerApproval',        'view'),
    ('ReceivingOfficer', 'fertilizerApproval',        'none'),
    ('Administrator',    'fertilizerManagerApproval', 'view'),
    ('Officer',          'fertilizerManagerApproval', 'view'),
    ('Manager',          'fertilizerManagerApproval', 'approve'),
    ('ReceivingOfficer', 'fertilizerManagerApproval', 'none')
ON CONFLICT (role, module) DO NOTHING;

-- ─── Legacy Approved rows: FEFO-allocate what live stock allows ─────────────
-- Anything that can't be allocated moves to Needs review ("No live stock at migration");
-- Committed counts only what was allocated. No owner notice is queued for these.
DO $$
DECLARE
    r    RECORD;
    b    RECORD;
    need NUMERIC;
    take NUMERIC;
BEGIN
    FOR r IN
        SELECT fr.* FROM fertilizer_requests fr
         WHERE fr.status = 'Approved'
           AND NOT EXISTS (SELECT 1 FROM fertilizer_allocations a WHERE a.request_id = fr.id)
         ORDER BY fr.created_at, fr.id
    LOOP
        need := COALESCE(r.approved_qty_kg, r.quantity_kg) - r.dispatched_qty_kg;
        FOR b IN
            SELECT fb.id,
                   fb.quantity_kg - COALESCE((SELECT SUM(a.qty_kg) FROM fertilizer_allocations a
                                               WHERE a.batch_id = fb.id AND a.state = 'active'), 0) AS free
              FROM fertilizer_batches fb
             WHERE fb.item = r.item AND NOT fb.discarded AND fb.expiry_date >= CURRENT_DATE
             ORDER BY fb.expiry_date, fb.id
        LOOP
            EXIT WHEN need <= 0;
            take := LEAST(need, b.free);
            IF take > 0 THEN
                INSERT INTO fertilizer_allocations (request_id, batch_id, qty_kg) VALUES (r.id, b.id, take);
                need := need - take;
            END IF;
        END LOOP;

        IF need > 0 THEN
            UPDATE fertilizer_requests SET status = 'Needs review', updated_at = NOW() WHERE id = r.id;
            INSERT INTO fertilizer_request_events (request_id, actor, actor_role, action, from_status, to_status, note)
            VALUES (r.id, 'System (migration)', 'System', 'Moved to review', 'Approved', 'Needs review',
                    'No live stock at migration (' || need || ' kg could not be allocated)');
        END IF;
    END LOOP;
END $$;

COMMIT;
