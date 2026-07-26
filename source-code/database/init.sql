CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS & AUTH ───────────────────────────────────────────────

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    phone         VARCHAR(15) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          VARCHAR(30) NOT NULL
        CHECK (role IN ('estate_owner', 'estate_manager', 'plucking_employee',
                         'collection_agent', 'receiving_officer', 'factory_admin',
                         'factory_officer', 'factory_manager')),
    created_at    TIMESTAMP DEFAULT NOW()
);

-- ─── ESTATE SIDE ─────────────────────────────────────────────────

CREATE TABLE tea_estate_owners (
    id      SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    name    VARCHAR(100) NOT NULL,
    nic     VARCHAR(20),
    contact VARCHAR(15),
    email   VARCHAR(100)
);

-- Extended 2026-07-26 (Estates + Payments vertical slice) to carry the web
-- portal's `EstateOwner` contract in full — route is system-assigned at
-- registration (never manually picked, §Estates architecture decision) and
-- denormalized alongside route_id the same way tea_collection_records does.
-- Bank fields are nullable: an estate with no bank details on file is
-- automatically excluded from settlement runs (UC-054 exception), never
-- blocked from registering.
CREATE TABLE estates (
    id                 SERIAL PRIMARY KEY,
    owner_id           INTEGER NOT NULL REFERENCES tea_estate_owners(id),
    name               VARCHAR(100) NOT NULL,
    location           TEXT NOT NULL,
    address            TEXT,
    route_id           INTEGER, -- FK to routes(id) added below (routes is defined later in this file)
    route_name         VARCHAR(100),
    self_delivery      BOOLEAN NOT NULL DEFAULT FALSE, -- exempt from transport cost deduction
    status             VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    ytd_deliveries_kg  DECIMAL(10,2) NOT NULL DEFAULT 0,
    bank_name          VARCHAR(100),
    bank_branch        VARCHAR(100),
    bank_account       VARCHAR(30),
    last_updated_by    VARCHAR(100),
    last_updated_on    TIMESTAMP,
    created_at         TIMESTAMP DEFAULT NOW()
);

CREATE TABLE estate_documents (
    id          SERIAL PRIMARY KEY,
    estate_id   INTEGER NOT NULL REFERENCES estates(id),
    name        VARCHAR(255) NOT NULL,
    uploaded_on DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE estate_employees (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL UNIQUE REFERENCES users(id),
    estate_id     INTEGER NOT NULL REFERENCES estates(id),
    name          VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    nic           VARCHAR(20) UNIQUE NOT NULL,
    role          VARCHAR(30) NOT NULL
        CHECK (role IN ('manager', 'plucking_employee')),
    is_active     BOOLEAN DEFAULT TRUE
);

CREATE TABLE tea_estate_managers (
    id          SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL UNIQUE REFERENCES estate_employees(id),
    estate_id   INTEGER NOT NULL REFERENCES estates(id),
    assigned_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE plucking_employees (
    id                            SERIAL PRIMARY KEY,
    employee_id                   INTEGER NOT NULL UNIQUE REFERENCES estate_employees(id),
    total_weight_plucked_lifetime DECIMAL(10,2) DEFAULT 0,
    avg_monthly_plucking_weight   DECIMAL(10,2) DEFAULT 0,
    rating                        DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5)
);

CREATE TABLE daily_plucking_records (
    id          SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES plucking_employees(id),
    manager_id  INTEGER NOT NULL REFERENCES tea_estate_managers(id),
    date        DATE NOT NULL,
    weight_kg   DECIMAL(8,2) NOT NULL,
    notes       TEXT
);

CREATE TABLE plucking_completion_reports (
    id           SERIAL PRIMARY KEY,
    manager_id   INTEGER NOT NULL REFERENCES tea_estate_managers(id),
    estate_id    INTEGER NOT NULL REFERENCES estates(id),
    report_date  DATE NOT NULL,
    total_weight DECIMAL(10,2) NOT NULL,
    status       VARCHAR(20) DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'reviewed')),
    submitted_at TIMESTAMP DEFAULT NOW()
);

-- ─── FACTORY SIDE ────────────────────────────────────────────────

CREATE TABLE factories (
    id       SERIAL PRIMARY KEY,
    name     VARCHAR(100) NOT NULL,
    location TEXT
);

CREATE TABLE factory_employees (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL UNIQUE REFERENCES users(id),
    factory_id    INTEGER NOT NULL REFERENCES factories(id),
    name          VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    nic           VARCHAR(20) UNIQUE NOT NULL,
    role          VARCHAR(30) NOT NULL
        CHECK (role IN ('collection_agent', 'receiving_officer', 'factory_admin',
                         'factory_officer', 'factory_manager')),
    is_active     BOOLEAN DEFAULT TRUE
);

CREATE TABLE collection_agents (
    id           SERIAL PRIMARY KEY,
    employee_id  INTEGER NOT NULL UNIQUE REFERENCES factory_employees(id),
    factory_id   INTEGER NOT NULL REFERENCES factories(id),
    is_available BOOLEAN DEFAULT TRUE
);

CREATE TABLE receiving_officers (
    id          SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL UNIQUE REFERENCES factory_employees(id),
    factory_id  INTEGER NOT NULL REFERENCES factories(id)
);

CREATE TABLE factory_admins (
    id          SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL UNIQUE REFERENCES factory_employees(id),
    factory_id  INTEGER NOT NULL REFERENCES factories(id)
);

-- ─── ROUTES ──────────────────────────────────────────────────────

CREATE TABLE routes (
    id         SERIAL PRIMARY KEY,
    factory_id INTEGER NOT NULL REFERENCES factories(id),
    name       VARCHAR(100)
);

CREATE TABLE estate_route_mapping (
    id         SERIAL PRIMARY KEY,
    route_id   INTEGER NOT NULL REFERENCES routes(id),
    estate_id  INTEGER NOT NULL REFERENCES estates(id),
    factory_id INTEGER NOT NULL REFERENCES factories(id)
);

-- estates.route_id forward-references routes, defined just above.
ALTER TABLE estates ADD CONSTRAINT estates_route_id_fkey
    FOREIGN KEY (route_id) REFERENCES routes(id);

-- ─── TEA COLLECTION WORKFLOW ─────────────────────────────────────
-- Reconciled 2026-07-26 (collections vertical slice) to match the design
-- decisions in Claude.md: photo evidence only, never OTP (§ Weight
-- verification), and the web portal's single-record status chain
-- (Submitted → Approved → Agent Assigned → Collected → Confirmed, plus the
-- web-originated "Pending Agent Confirmation" exception state, §7.1). The old
-- tea_selling_requests / tea_collection_assignments / tea_collection_records
-- (OTP-based) / tea_receiving_records lineage is superseded — collapsed into
-- one collection_records table the web portal reads/writes directly. The
-- full Route/Pickup request state machine (estate-initiated requests,
-- auto-assignment) is mobile-driven and deferred to PLAN.md Phase 3; this
-- table intentionally captures the flattened view the web portal needs now.

CREATE TABLE tea_collection_records (
    id               VARCHAR(20) PRIMARY KEY, -- business key, e.g. 'GV-2026-0714'
    estate_id        INTEGER REFERENCES estates(id),
    -- Opaque estate label from the portal's still-fixture-based Estates module (e.g.
    -- 'EST-0001'), used only for exception entries logged before an estate has a real
    -- estates.id to link to. Independent of estate_id; drop once Estates is wired.
    estate_ref       VARCHAR(20),
    estate_name      VARCHAR(100) NOT NULL, -- denormalized snapshot, as shown in the UI
    route_id         INTEGER REFERENCES routes(id),
    route_name       VARCHAR(100) NOT NULL,
    weight_kg        DECIMAL(10,2) NOT NULL,
    grade            VARCHAR(10) NOT NULL DEFAULT 'pending'
        CHECK (grade IN ('super', 'normal', 'pending')),
    status           VARCHAR(30) NOT NULL DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'approved', 'agent_assigned', 'collected',
                           'confirmed', 'pending_agent_confirmation')),
    collection_date  DATE NOT NULL,
    agent_id         INTEGER REFERENCES collection_agents(id),
    agent_name       VARCHAR(100) NOT NULL DEFAULT 'Self-delivered',
    photos           JSONB NOT NULL DEFAULT '[]',   -- [{label, timestamp, takenBy}]
    timeline         JSONB NOT NULL DEFAULT '[]',   -- [{status, timestamp, by}]
    provisional      JSONB, -- {reportedBy, reason} — set on web-originated exception entries
    mismatch         JSONB, -- {complaintId, note} — set when a weight-mismatch complaint exists
    last_updated_by  VARCHAR(100),
    last_updated_on  TIMESTAMP,
    created_at       TIMESTAMP DEFAULT NOW()
);

-- ─── FERTILIZER WORKFLOW ──────────────────────────────────────────
-- (created before complaints, since complaints references fertilizer_requests)

CREATE TABLE fertilizer_requests (
    id             SERIAL PRIMARY KEY,
    requested_by   INTEGER NOT NULL REFERENCES estate_employees(id), -- manager
    estate_id      INTEGER NOT NULL REFERENCES estates(id),
    owner_id       INTEGER NOT NULL REFERENCES tea_estate_owners(id),
    quantity_kg    DECIMAL(10,2) NOT NULL,
    justification  TEXT,
    owner_status   VARCHAR(20) DEFAULT 'pending'
        CHECK (owner_status IN ('pending', 'approved', 'rejected')),
    factory_id     INTEGER REFERENCES factories(id),
    factory_status VARCHAR(20) DEFAULT 'pending'
        CHECK (factory_status IN ('pending', 'approved', 'rejected')),
    created_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE fertilizer_dispatches (
    id                        SERIAL PRIMARY KEY,
    fertilizer_request_id     INTEGER NOT NULL UNIQUE REFERENCES fertilizer_requests(id),
    agent_id                  INTEGER NOT NULL REFERENCES collection_agents(id),
    collection_record_id      VARCHAR(20) REFERENCES tea_collection_records(id), -- dispatched together with tea collection
    dispatched_at             TIMESTAMP,
    delivered_at              TIMESTAMP,
    status                    VARCHAR(20) DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'in_transit', 'delivered'))
);

CREATE TABLE fertilizer_charges (
    id                     SERIAL PRIMARY KEY,
    fertilizer_request_id  INTEGER NOT NULL UNIQUE REFERENCES fertilizer_requests(id),
    rate_per_kg            DECIMAL(8,2) NOT NULL,
    quantity_kg            DECIMAL(10,2) NOT NULL,
    total_charge           DECIMAL(10,2) NOT NULL,
    calculated_at          TIMESTAMP DEFAULT NOW()
);

-- ─── COMPLAINTS ───────────────────────────────────────────────────

CREATE TABLE complaints (
    id                     SERIAL PRIMARY KEY,
    type                   VARCHAR(30) NOT NULL
        CHECK (type IN ('weight_mismatch', 'fertilizer_quality')),
    raised_by_user_id      INTEGER NOT NULL REFERENCES users(id),
    collection_record_id   VARCHAR(20) REFERENCES tea_collection_records(id),
    fertilizer_request_id  INTEGER REFERENCES fertilizer_requests(id),
    description            TEXT,
    status                 VARCHAR(20) DEFAULT 'open'
        CHECK (status IN ('open', 'acknowledged', 'resolved')),
    created_at             TIMESTAMP DEFAULT NOW()
);

-- ─── PAYMENTS ────────────────────────────────────────────────────
-- `monthly_payments` / `payment_deduction_items` below predate the Estates +
-- Payments vertical slice (2026-07-26) and don't match the web portal's
-- settlement contract (per-estate, per-period, with a transport/advance
-- breakdown). Superseded for the portal's purposes by `settlements` below;
-- left in place, unused, to avoid disturbing `fertilizer_charges`' only
-- other referencer. See Claude.md's Payment calculation section.

CREATE TABLE monthly_payments (
    id                    SERIAL PRIMARY KEY,
    factory_id            INTEGER NOT NULL REFERENCES factories(id),
    owner_id              INTEGER NOT NULL REFERENCES tea_estate_owners(id),
    payment_month         DATE NOT NULL, -- first day of the month
    gross_amount          DECIMAL(12,2) NOT NULL,
    fertilizer_deductions DECIMAL(12,2) DEFAULT 0,
    net_amount            DECIMAL(12,2) NOT NULL,
    status                VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'finalized', 'paid')),
    finalized_at          TIMESTAMP
);

CREATE TABLE payment_deduction_items (
    id                   SERIAL PRIMARY KEY,
    monthly_payment_id   INTEGER NOT NULL REFERENCES monthly_payments(id),
    fertilizer_charge_id INTEGER NOT NULL REFERENCES fertilizer_charges(id),
    deducted_amount      DECIMAL(10,2) NOT NULL
);

-- `estate_advances` (EST-05/06) — money issued to an estate owner ahead of
-- settlement, deducted at the next processed run for that estate.
CREATE TABLE estate_advances (
    id          VARCHAR(20) PRIMARY KEY, -- business key, e.g. 'EADV-2026-0031'
    estate_id   INTEGER NOT NULL REFERENCES estates(id),
    estate_name VARCHAR(100) NOT NULL,
    amount      DECIMAL(12,2) NOT NULL,
    reason      TEXT NOT NULL,
    date_issued DATE NOT NULL,
    issued_by   VARCHAR(100) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending_deduction'
        CHECK (status IN ('pending_deduction', 'deducted')),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- `settlements` (EST-07/08) — one row per estate per period. Denormalized
-- with snapshot rate/deduction values (mirrors the portal's fixture shape)
-- rather than joined from grade_rates/fertilizer_dispatches, since neither
-- of those exist yet (ADM-01, FERT — PLAN.md Phase 2.6/2.4). Net payable =
-- gross − transport − fertilizer − advance; NO per-transaction bank charge
-- is deducted (resolved 2026-07-26: the factory is billed a separate
-- periodic platform fee instead — see Claude.md's Payment calculation
-- section). Missing-bank estates are excluded from processing, not blocked
-- from having a settlement computed (UC-054 exception).
CREATE TABLE settlements (
    id                   VARCHAR(20) PRIMARY KEY, -- business key, e.g. 'SET-2026-07-001'
    estate_id            INTEGER NOT NULL REFERENCES estates(id),
    estate_name          VARCHAR(100) NOT NULL,
    period               VARCHAR(20) NOT NULL, -- e.g. 'July 2026'
    super_kg             DECIMAL(10,2) NOT NULL DEFAULT 0,
    normal_kg            DECIMAL(10,2) NOT NULL DEFAULT 0,
    super_rate           DECIMAL(8,2) NOT NULL,
    normal_rate          DECIMAL(8,2) NOT NULL,
    transport_cost       DECIMAL(10,2) NOT NULL DEFAULT 0,
    fertilizer_deduction DECIMAL(10,2) NOT NULL DEFAULT 0,
    advance_deduction    DECIMAL(10,2) NOT NULL DEFAULT 0,
    status               VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processed')),
    self_delivery        BOOLEAN NOT NULL DEFAULT FALSE,
    missing_bank         BOOLEAN NOT NULL DEFAULT FALSE,
    processed_by         VARCHAR(100),
    processed_on         TIMESTAMP,
    created_at           TIMESTAMP DEFAULT NOW()
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────

CREATE TABLE notifications (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id),
    type           VARCHAR(50) NOT NULL
        CHECK (type IN ('delivery_confirmation', 'otp', 'complaint',
                         'fertilizer_approval', 'payment_update',
                         'collection_complete', 'no_agents')),
    title          VARCHAR(150),
    body           TEXT,
    is_read        BOOLEAN DEFAULT FALSE,
    reference_id   INTEGER, -- generic FK to relevant record
    reference_type VARCHAR(50), -- e.g. tea_collection_records, fertilizer_requests
    created_at     TIMESTAMP DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- Indexes for common lookups
-- ════════════════════════════════════════════════════════════════

CREATE INDEX idx_estates_owner ON estates(owner_id);
CREATE INDEX idx_estate_employees_estate ON estate_employees(estate_id);
CREATE INDEX idx_daily_plucking_employee ON daily_plucking_records(employee_id);
CREATE INDEX idx_daily_plucking_date ON daily_plucking_records(date);
CREATE INDEX idx_collection_records_estate ON tea_collection_records(estate_id);
CREATE INDEX idx_collection_records_status ON tea_collection_records(status);
CREATE INDEX idx_fertilizer_requests_estate ON fertilizer_requests(estate_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_monthly_payments_owner ON monthly_payments(owner_id);
CREATE INDEX idx_monthly_payments_month ON monthly_payments(payment_month);
CREATE INDEX idx_estate_documents_estate ON estate_documents(estate_id);
CREATE INDEX idx_estate_advances_estate ON estate_advances(estate_id);
CREATE INDEX idx_settlements_estate ON settlements(estate_id);
CREATE INDEX idx_settlements_status ON settlements(status);
