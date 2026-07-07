CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS & AUTH ───────────────────────────────────────────────

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    phone         VARCHAR(15) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          VARCHAR(30) NOT NULL
        CHECK (role IN ('estate_owner', 'estate_manager', 'employee', 'collector',
                         'receiving_officer', 'factory_admin', 'factory_officer',
                         'factory_manager')),
    created_at    TIMESTAMP DEFAULT NOW()
);

-- ─── ESTATE SIDE ─────────────────────────────────────────────────

CREATE TABLE tea_estate_owners (
    id      SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    name    VARCHAR(100) NOT NULL
);

CREATE TABLE estates (
    id       SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES tea_estate_owners(id),
    name     VARCHAR(100) NOT NULL,
    location TEXT NOT NULL
);

CREATE TABLE estate_employees (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL UNIQUE REFERENCES users(id),
    estate_id     INTEGER NOT NULL REFERENCES estates(id),
    name          VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    nic           VARCHAR(20) UNIQUE NOT NULL,
    role          VARCHAR(30) NOT NULL
        CHECK (role IN ('estate_manager', 'employee')),
    is_active     BOOLEAN DEFAULT TRUE
);

CREATE TABLE tea_estate_managers (
    id          SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL UNIQUE REFERENCES estate_employees(id),
    estate_id   INTEGER NOT NULL REFERENCES estates(id),
    assigned_at TIMESTAMP DEFAULT NOW()
);

-- Production-tracking subtype for estate_employees whose role = 'employee' and who pluck tea.
-- Not every 'employee' row needs a matching plucking_employees row (self-service-only staff
-- with no plucking duties simply won't have one).
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

CREATE TABLE trucks (
    id           SERIAL PRIMARY KEY,
    factory_id   INTEGER NOT NULL REFERENCES factories(id),
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    capacity_kg  DECIMAL(10,2),
    is_active    BOOLEAN DEFAULT TRUE
);

CREATE TABLE factory_employees (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL UNIQUE REFERENCES users(id),
    factory_id    INTEGER NOT NULL REFERENCES factories(id),
    name          VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    nic           VARCHAR(20) UNIQUE NOT NULL,
    role          VARCHAR(30) NOT NULL
        CHECK (role IN ('collector', 'receiving_officer', 'factory_admin',
                         'factory_officer', 'factory_manager')),
    is_active     BOOLEAN DEFAULT TRUE
);

CREATE TABLE collectors (
    id          SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL UNIQUE REFERENCES factory_employees(id),
    factory_id  INTEGER NOT NULL REFERENCES factories(id)
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

CREATE TABLE factory_officers (
    id          SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL UNIQUE REFERENCES factory_employees(id),
    factory_id  INTEGER NOT NULL REFERENCES factories(id)
);

CREATE TABLE factory_managers (
    id          SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL UNIQUE REFERENCES factory_employees(id),
    factory_id  INTEGER NOT NULL REFERENCES factories(id)
);

-- ─── ROUTES (factory-controlled) ─────────────────────────────────

CREATE TABLE routes (
    id            SERIAL PRIMARY KEY,
    factory_id    INTEGER NOT NULL REFERENCES factories(id),
    truck_id      INTEGER REFERENCES trucks(id),
    collector_id  INTEGER NOT NULL REFERENCES collectors(id),
    driver_name   VARCHAR(100), -- drivers are HR-only (no login); no driver table modeled yet
    route_date    DATE NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'active', 'completed', 'delayed', 'cancelled')),
    status_reason TEXT, -- required (enforced in application layer) when status is 'delayed'/'cancelled'
    started_at    TIMESTAMP, -- set when collector presses "Start Route"
    completed_at  TIMESTAMP,
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE route_stops (
    id                      SERIAL PRIMARY KEY,
    route_id                INTEGER NOT NULL REFERENCES routes(id),
    estate_id               INTEGER NOT NULL REFERENCES estates(id),
    stop_order              INTEGER NOT NULL,
    has_tea_pickup          BOOLEAN DEFAULT FALSE,
    has_fertilizer_delivery BOOLEAN DEFAULT FALSE,
    UNIQUE (route_id, estate_id)
);

-- ─── PICKUP REQUESTS (estate-controlled, independent of route status) ────

CREATE TABLE pickup_requests (
    id                  SERIAL PRIMARY KEY,
    estate_id           INTEGER NOT NULL REFERENCES estates(id),
    owner_id            INTEGER NOT NULL REFERENCES tea_estate_owners(id),
    factory_id          INTEGER NOT NULL REFERENCES factories(id), -- owner picks a factory, not a collector
    route_stop_id       INTEGER REFERENCES route_stops(id), -- set once auto-assigned to the estate's active-route stop
    request_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'on_the_way', 'picked_up',
                           'completed', 'expired', 'cancelled')),
    decline_reason      TEXT, -- required when a stop is individually declined
    estimated_weight_kg DECIMAL(10,2),
    gps_pin_lat         DECIMAL(9,6), -- captured offline-capable (device GPS), distinct from live tracking
    gps_pin_lng         DECIMAL(9,6),
    requested_at        TIMESTAMP DEFAULT NOW(),
    response_deadline   TIMESTAMP, -- system auto-expires to 'expired' if collector doesn't respond in time
    resolved_at         TIMESTAMP
);

-- Enforces "one active pickup request per estate per day" (PENDING..PICKED_UP count as active;
-- a new request is only allowed once the current one is EXPIRED/CANCELLED/COMPLETED).
CREATE UNIQUE INDEX idx_one_active_pickup_per_estate_per_day
    ON pickup_requests (estate_id, request_date)
    WHERE status NOT IN ('expired', 'cancelled', 'completed');

-- ─── TEA COLLECTION WORKFLOW ─────────────────────────────────────

CREATE TABLE tea_collection_records (
    id                SERIAL PRIMARY KEY,
    pickup_request_id INTEGER REFERENCES pickup_requests(id), -- NULL for manual/offline (phone-arranged) entries
    route_stop_id     INTEGER REFERENCES route_stops(id),
    collector_id      INTEGER NOT NULL REFERENCES collectors(id),
    estate_id         INTEGER NOT NULL REFERENCES estates(id),
    actual_weight_kg  DECIMAL(10,2) NOT NULL,
    self_delivered    BOOLEAN DEFAULT FALSE, -- skips transport deduction when true
    owner_confirmed   BOOLEAN DEFAULT FALSE, -- on-device confirmation, separate from photo evidence
    evidence_url      TEXT, -- Cloudinary photo URL of the scale/weighing
    collected_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tea_receiving_records (
    id                    SERIAL PRIMARY KEY,
    collection_record_id  INTEGER NOT NULL UNIQUE REFERENCES tea_collection_records(id),
    receiving_officer_id  INTEGER NOT NULL REFERENCES receiving_officers(id),
    factory_id            INTEGER NOT NULL REFERENCES factories(id),
    received_weight_kg    DECIMAL(10,2) NOT NULL,
    tea_grade             VARCHAR(10) NOT NULL
        CHECK (tea_grade IN ('super', 'normal')),
    received_at           TIMESTAMP DEFAULT NOW(),
    status                VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'disputed'))
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
    id                    SERIAL PRIMARY KEY,
    fertilizer_request_id INTEGER NOT NULL UNIQUE REFERENCES fertilizer_requests(id),
    collector_id          INTEGER NOT NULL REFERENCES collectors(id),
    route_stop_id         INTEGER REFERENCES route_stops(id), -- delivered via the same route stop as tea pickup
    dispatched_at         TIMESTAMP,
    delivered_at          TIMESTAMP,
    status                VARCHAR(20) DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'in_transit', 'delivered'))
);

CREATE TABLE fertilizer_charges (
    id                    SERIAL PRIMARY KEY,
    fertilizer_request_id INTEGER NOT NULL UNIQUE REFERENCES fertilizer_requests(id),
    rate_per_kg           DECIMAL(8,2) NOT NULL,
    quantity_kg           DECIMAL(10,2) NOT NULL,
    total_charge          DECIMAL(10,2) NOT NULL,
    calculated_at         TIMESTAMP DEFAULT NOW()
);

-- ─── COMPLAINTS ───────────────────────────────────────────────────

CREATE TABLE complaints (
    id                    SERIAL PRIMARY KEY,
    type                  VARCHAR(30) NOT NULL
        CHECK (type IN ('weight_mismatch', 'fertilizer_quality')),
    raised_by_user_id     INTEGER NOT NULL REFERENCES users(id),
    collection_record_id  INTEGER REFERENCES tea_collection_records(id),
    fertilizer_request_id INTEGER REFERENCES fertilizer_requests(id),
    description           TEXT,
    status                VARCHAR(20) DEFAULT 'open'
        CHECK (status IN ('open', 'acknowledged', 'resolved')),
    created_at            TIMESTAMP DEFAULT NOW()
);

-- ─── PAYMENTS (estate owner side) ─────────────────────────────────
-- Employee payroll (Attendance/SalaryAdvance/PaymentStatement for staff) is deferred: it needs
-- a generic HR employee record spanning login and non-login roles that doesn't exist yet, and
-- is tracked as a follow-up rather than modeled on a shaky FK-less table here.

CREATE TABLE advance_payments (
    id           SERIAL PRIMARY KEY,
    owner_id     INTEGER NOT NULL REFERENCES tea_estate_owners(id),
    factory_id   INTEGER NOT NULL REFERENCES factories(id),
    amount       DECIMAL(10,2) NOT NULL,
    requested_at TIMESTAMP DEFAULT NOW(),
    status       VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'settled'))
);

CREATE TABLE monthly_payments (
    id                    SERIAL PRIMARY KEY,
    factory_id            INTEGER NOT NULL REFERENCES factories(id),
    owner_id              INTEGER NOT NULL REFERENCES tea_estate_owners(id),
    payment_month         DATE NOT NULL, -- first day of the month
    super_weight_kg       DECIMAL(10,2) DEFAULT 0,
    normal_weight_kg      DECIMAL(10,2) DEFAULT 0,
    gross_amount          DECIMAL(12,2) NOT NULL,
    transport_cost        DECIMAL(12,2) DEFAULT 0, -- 0 when all collections were self_delivered
    fertilizer_deductions DECIMAL(12,2) DEFAULT 0,
    advance_deductions    DECIMAL(12,2) DEFAULT 0,
    bank_transfer_fee     DECIMAL(8,2) DEFAULT 0, -- per-transaction fee, deducted from this payee's net payable
    net_amount            DECIMAL(12,2) NOT NULL,
    status                VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'finalized', 'paid')),
    finalized_at          TIMESTAMP
);

-- Generalized line-item breakdown of a monthly payment's deductions.
CREATE TABLE payment_deduction_items (
    id                 SERIAL PRIMARY KEY,
    monthly_payment_id INTEGER NOT NULL REFERENCES monthly_payments(id),
    deduction_type     VARCHAR(20) NOT NULL
        CHECK (deduction_type IN ('fertilizer', 'advance', 'transport', 'bank_fee')),
    reference_id       INTEGER, -- fertilizer_charges.id or advance_payments.id, depending on deduction_type
    amount             DECIMAL(10,2) NOT NULL
);

CREATE TABLE payment_statements (
    id                 SERIAL PRIMARY KEY,
    monthly_payment_id INTEGER NOT NULL UNIQUE REFERENCES monthly_payments(id),
    file_url           TEXT, -- exported Excel/CSV/PDF for bank submission
    generated_at       TIMESTAMP DEFAULT NOW()
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────

CREATE TABLE notifications (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id),
    type           VARCHAR(50) NOT NULL
        CHECK (type IN ('route_active', 'route_delayed', 'route_cancelled',
                         'pickup_expired', 'delivery_confirmation', 'complaint',
                         'fertilizer_approval', 'payment_update', 'collection_complete')),
    title          VARCHAR(150),
    body           TEXT,
    is_read        BOOLEAN DEFAULT FALSE,
    reference_id   INTEGER, -- generic FK to relevant record
    reference_type VARCHAR(50), -- e.g. tea_collection_records, pickup_requests, routes
    created_at     TIMESTAMP DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- Indexes for common lookups
-- ════════════════════════════════════════════════════════════════

CREATE INDEX idx_estates_owner ON estates(owner_id);
CREATE INDEX idx_estate_employees_estate ON estate_employees(estate_id);
CREATE INDEX idx_daily_plucking_employee ON daily_plucking_records(employee_id);
CREATE INDEX idx_daily_plucking_date ON daily_plucking_records(date);
CREATE INDEX idx_routes_factory ON routes(factory_id);
CREATE INDEX idx_routes_date ON routes(route_date);
CREATE INDEX idx_routes_status ON routes(status);
CREATE INDEX idx_route_stops_route ON route_stops(route_id);
CREATE INDEX idx_route_stops_estate ON route_stops(estate_id);
CREATE INDEX idx_pickup_requests_estate ON pickup_requests(estate_id);
CREATE INDEX idx_pickup_requests_status ON pickup_requests(status);
CREATE INDEX idx_collection_records_estate ON tea_collection_records(estate_id);
CREATE INDEX idx_fertilizer_requests_estate ON fertilizer_requests(estate_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_monthly_payments_owner ON monthly_payments(owner_id);
CREATE INDEX idx_monthly_payments_month ON monthly_payments(payment_month);
