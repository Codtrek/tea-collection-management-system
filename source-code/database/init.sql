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
    -- Added 2026-07-28 (Administration slice, 2.6). ADM-02 suspend flips this;
    -- a suspended account is rejected at login. last_login_at is stamped on a
    -- successful login so the Users & Roles list shows a real "last login".
    status        VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended')),
    last_login_at TIMESTAMP,
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

-- Extended 2026-07-27 (Fertilizer vertical slice, 2.4) to carry the web
-- portal's `FertilizerRequest` contract (owner/factory dual approval was
-- never built in the portal — it drives approval off a single `status`
-- lifecycle instead). `owner_status`/`factory_status` are kept, defaulted,
-- for the future mobile owner-approval flow; the portal reads/writes `status`.
-- `requested_by` is now nullable: the Estates module never modeled
-- `estate_employees` managers at the app layer (settlements/advances key
-- off estate_id/owner_id directly), and the portal's FERT-07 "log phoned-in
-- request" flow records against an estate, not a specific manager — same
-- "nullable because this slice doesn't populate it" reasoning as `estates`'
-- bank fields.
CREATE TABLE fertilizer_requests (
    id                SERIAL PRIMARY KEY,
    requested_by      INTEGER REFERENCES estate_employees(id), -- manager; null when logged by factory staff
    estate_id         INTEGER NOT NULL REFERENCES estates(id),
    owner_id          INTEGER NOT NULL REFERENCES tea_estate_owners(id),
    item              VARCHAR(100) NOT NULL DEFAULT 'Urea Fertilizer',
    quantity_kg       DECIMAL(10,2) NOT NULL,
    justification     TEXT,
    owner_status      VARCHAR(20) DEFAULT 'pending'
        CHECK (owner_status IN ('pending', 'approved', 'rejected')),
    factory_id        INTEGER REFERENCES factories(id),
    factory_status    VARCHAR(20) DEFAULT 'pending'
        CHECK (factory_status IN ('pending', 'approved', 'rejected')),
    origin            VARCHAR(10) NOT NULL DEFAULT 'web'
        CHECK (origin IN ('mobile', 'web')),
    status            VARCHAR(20) NOT NULL DEFAULT 'Submitted'
        CHECK (status IN ('Submitted', 'Approved', 'Partially Dispatched',
                           'Dispatched', 'Deducted', 'Rejected', 'Cancelled')),
    approved_qty_kg   DECIMAL(10,2), -- set once decided; may be < quantity_kg (partial fulfilment)
    dispatched_qty_kg DECIMAL(10,2) NOT NULL DEFAULT 0, -- running total against approved_qty_kg
    decided_by        VARCHAR(100),
    decided_on        TIMESTAMP,
    created_at        TIMESTAMP DEFAULT NOW()
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

-- Stock side (added 2.4, alongside the request workflow above). Batches are
-- FEFO-tracked (`expiry_date` drives allocation, never entry order);
-- `category` folds beneficiary items (rice) into the same batch/movement
-- model as fertilizer proper (addendum §11.25) rather than a parallel table.
CREATE TABLE fertilizer_batches (
    id               SERIAL PRIMARY KEY,
    item             VARCHAR(100) NOT NULL,
    category         VARCHAR(20) NOT NULL DEFAULT 'Fertilizer'
        CHECK (category IN ('Fertilizer', 'Beneficiary')),
    quantity_kg      DECIMAL(10,2) NOT NULL,
    unit             VARCHAR(10) NOT NULL DEFAULT 'kg'
        CHECK (unit IN ('kg', 'bags')),
    received_date    DATE NOT NULL,
    expiry_date      DATE NOT NULL,
    location         VARCHAR(100),
    supplier         VARCHAR(100),
    lot_number       VARCHAR(50),
    quality_notes    TEXT,
    discarded        BOOLEAN NOT NULL DEFAULT FALSE,
    last_updated_by  VARCHAR(100),
    last_updated_on  TIMESTAMP,
    created_at       TIMESTAMP DEFAULT NOW()
);

-- `linked_request_id` is nullable by design — ad-hoc dispatch (no approved
-- request behind it) is allowed alongside request-linked dispatch; both
-- feed the same stock ledger (resolved 2026-07-27, see PLAN.md).
CREATE TABLE stock_movements (
    id                 SERIAL PRIMARY KEY,
    batch_id           INTEGER NOT NULL REFERENCES fertilizer_batches(id),
    type               VARCHAR(10) NOT NULL
        CHECK (type IN ('Incoming', 'Outgoing')),
    quantity_kg        DECIMAL(10,2) NOT NULL,
    movement_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    destination        VARCHAR(100), -- Outgoing: estate owner or collection agent receiving the stock
    linked_request_id  INTEGER REFERENCES fertilizer_requests(id),
    supplier           VARCHAR(100), -- Incoming
    notes              TEXT,
    recorded_by        VARCHAR(100),
    created_at         TIMESTAMP DEFAULT NOW()
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

-- ─── EMPLOYEES + PAYROLL ─────────────────────────────────────────
-- `employees` (EMP-01..14) is the HR roster shown in the web portal — a new,
-- separate table from `factory_employees` above. `factory_employees` remains
-- the auth/permission subtype table backing the 3 factory login roles
-- (Administrator/Officer/Manager); `employees` is the broader HR record set
-- (Machine Operators, Drivers, etc.), most of which have no login at all
-- (`user_id` nullable). The two are intentionally unrelated at the DB level.
CREATE TABLE employees (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER UNIQUE REFERENCES users(id), -- null: HR record only, no login
    name             VARCHAR(100) NOT NULL,
    nic              VARCHAR(20) UNIQUE NOT NULL,
    dob              DATE,
    contact          VARCHAR(20),
    address          TEXT,
    role             VARCHAR(50) NOT NULL, -- free-text job title, not the factory_employees role enum
    department       VARCHAR(50),
    hire_date        DATE,
    employment_type  VARCHAR(20) NOT NULL DEFAULT 'Permanent'
        CHECK (employment_type IN ('Permanent', 'Contract', 'Casual')),
    status           VARCHAR(20) NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active', 'Suspended', 'Inactive')),
    bank_name        VARCHAR(100),
    bank_branch      VARCHAR(100),
    bank_account     VARCHAR(50),
    day_rate         DECIMAL(8,2) NOT NULL DEFAULT 0,
    day_ot_rate      DECIMAL(8,2) NOT NULL DEFAULT 0,
    night_rate       DECIMAL(8,2) NOT NULL DEFAULT 0,
    night_ot_rate    DECIMAL(8,2) NOT NULL DEFAULT 0,
    has_login        BOOLEAN NOT NULL DEFAULT FALSE,
    last_updated_by  VARCHAR(100),
    last_updated_on  TIMESTAMP,
    created_at       TIMESTAMP DEFAULT NOW()
);

-- One row per employee per day; upserted on re-marking. Hours feed payroll
-- generation (shift-based: Day/Day-OT/Night/Night-OT, per Claude.md).
CREATE TABLE employee_attendance (
    id             SERIAL PRIMARY KEY,
    employee_id    INTEGER NOT NULL REFERENCES employees(id),
    date           DATE NOT NULL,
    status         VARCHAR(20) NOT NULL
        CHECK (status IN ('Present', 'Absent', 'Leave', 'Half-day')),
    day_hours      DECIMAL(5,2) NOT NULL DEFAULT 0,
    day_ot_hours   DECIMAL(5,2) NOT NULL DEFAULT 0,
    night_hours    DECIMAL(5,2) NOT NULL DEFAULT 0,
    night_ot_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
    marked_by      VARCHAR(100),
    created_at     TIMESTAMP DEFAULT NOW(),
    UNIQUE (employee_id, date)
);

-- Employee-requested salary advance (EMP-09/10). `deducted` tracks whether an
-- Approved advance has already been applied to a processed payroll run,
-- separate from the approval-workflow `status`.
CREATE TABLE salary_advances (
    id             VARCHAR(20) PRIMARY KEY, -- business key, e.g. 'EMP-ADV-0231'
    employee_id    INTEGER NOT NULL REFERENCES employees(id),
    employee_name  VARCHAR(100) NOT NULL,
    amount         DECIMAL(12,2) NOT NULL,
    reason         TEXT NOT NULL,
    date_requested DATE NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    deducted       BOOLEAN NOT NULL DEFAULT FALSE,
    decided_by     VARCHAR(100),
    decided_on     TIMESTAMP,
    created_at     TIMESTAMP DEFAULT NOW()
);

-- One row per employee per period, generated by aggregating
-- `employee_attendance` × the employee's rates (snapshotted here so a later
-- rate change never retroactively alters a past run — same principle as
-- effective-dated grade rates). NO per-transaction bank charge is deducted
-- (same resolved rule as Estates settlements). Missing-bank employees are
-- excluded from processing, not blocked from having a run generated.
CREATE TABLE payroll_runs (
    id                 VARCHAR(20) PRIMARY KEY, -- business key, e.g. 'PR-0001'
    employee_id        INTEGER NOT NULL REFERENCES employees(id),
    employee_name      VARCHAR(100) NOT NULL,
    period             VARCHAR(20) NOT NULL, -- e.g. 'July 2026'
    day_hours          DECIMAL(6,2) NOT NULL DEFAULT 0,
    day_ot_hours       DECIMAL(6,2) NOT NULL DEFAULT 0,
    night_hours        DECIMAL(6,2) NOT NULL DEFAULT 0,
    night_ot_hours     DECIMAL(6,2) NOT NULL DEFAULT 0,
    day_rate           DECIMAL(8,2) NOT NULL DEFAULT 0,
    day_ot_rate        DECIMAL(8,2) NOT NULL DEFAULT 0,
    night_rate         DECIMAL(8,2) NOT NULL DEFAULT 0,
    night_ot_rate      DECIMAL(8,2) NOT NULL DEFAULT 0,
    gross              DECIMAL(12,2) NOT NULL DEFAULT 0,
    deductions_advances DECIMAL(12,2) NOT NULL DEFAULT 0,
    deductions_other   DECIMAL(12,2) NOT NULL DEFAULT 0,
    status             VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Processed')),
    missing_bank       BOOLEAN NOT NULL DEFAULT FALSE,
    processed_by       VARCHAR(100),
    processed_on       TIMESTAMP,
    created_at         TIMESTAMP DEFAULT NOW(),
    UNIQUE (employee_id, period)
);

-- ─── REPORTS ──────────────────────────────────────────────────────
-- Added 2026-07-27 (Reports vertical slice, 2.5). Only holds the *manual*
-- daily operational expenses (RPT-04: utilities/maintenance/misc) that no
-- other workflow generates — the §8.1.6 gap the reports doc flagged. The
-- Payroll/Fertilizer/Transport expense lines RPT-03 also shows are DERIVED
-- at query time from `payroll_runs`/`settlements`, never duplicated here.
CREATE TABLE expense_entries (
    id           VARCHAR(20) PRIMARY KEY, -- business key, e.g. 'EXP-2026-0001'
    category     VARCHAR(20) NOT NULL
        CHECK (category IN ('Utilities', 'Maintenance', 'Miscellaneous', 'Other')),
    description  VARCHAR(200) NOT NULL,
    amount       DECIMAL(12,2) NOT NULL,
    entry_date   DATE NOT NULL,
    entered_by   VARCHAR(100) NOT NULL,
    created_at   TIMESTAMP DEFAULT NOW()
);

-- ─── ADMINISTRATION ───────────────────────────────────────────────
-- Added 2026-07-28 (Administration vertical slice, 2.6). The four Phase 0
-- tables the admin module makes server-driven: effective-dated grade rates
-- (ADM-01), the editable permission matrix (ADM-02), key/value system config
-- (ADM-03) and the append-only audit trail every module writes to (ADM-04).

-- ADM-01 — grade rates are VERSIONED by effective date. Settlements snapshot
-- the rate onto each row at settlement time, so past settlements never
-- recalculate when a new version is added here; the newest effective_date is
-- "current".
CREATE TABLE grade_rates (
    id             VARCHAR(20) PRIMARY KEY, -- business key, e.g. 'GR-2026-0001'
    super_rate     DECIMAL(8,2) NOT NULL,
    normal_rate    DECIMAL(8,2) NOT NULL,
    effective_date DATE NOT NULL,
    set_by         VARCHAR(100) NOT NULL,
    created_at     TIMESTAMP DEFAULT NOW()
);

-- ADM-02 — the data-driven permission matrix. One row per (role, module).
-- Seeded from the portal's DEFAULT_PERMISSIONS; the backend is now the source
-- of truth and the client constant is only a fallback default.
CREATE TABLE role_permissions (
    role   VARCHAR(20) NOT NULL
        CHECK (role IN ('Administrator', 'Officer', 'Manager')),
    module VARCHAR(30) NOT NULL,
    level  VARCHAR(10) NOT NULL
        CHECK (level IN ('none', 'view', 'edit', 'approve')),
    PRIMARY KEY (role, module)
);

-- ADM-03 — system-level configuration as key/value JSON (notification toggles,
-- session/security). One row per setting key.
CREATE TABLE system_settings (
    key        VARCHAR(60) PRIMARY KEY,
    value      JSONB NOT NULL,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ADM-04 — append-only audit trail. A shared AuditService writes one row per
-- mutation across every module; the log is read-only in the portal.
CREATE TABLE audit_logs (
    id          VARCHAR(20) PRIMARY KEY, -- business key, e.g. 'AUD-00001'
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    user_id     INTEGER REFERENCES users(id),
    user_name   VARCHAR(100) NOT NULL,
    role        VARCHAR(20) NOT NULL,
    action      VARCHAR(200) NOT NULL,
    module      VARCHAR(40) NOT NULL,
    record      VARCHAR(120),
    record_href VARCHAR(200),
    details     TEXT
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
CREATE INDEX idx_employee_attendance_employee ON employee_attendance(employee_id);
CREATE INDEX idx_employee_attendance_date ON employee_attendance(date);
CREATE INDEX idx_salary_advances_employee ON salary_advances(employee_id);
CREATE INDEX idx_payroll_runs_employee ON payroll_runs(employee_id);
CREATE INDEX idx_payroll_runs_status ON payroll_runs(status);
CREATE INDEX idx_expense_entries_date ON expense_entries(entry_date);
CREATE INDEX idx_fertilizer_requests_status ON fertilizer_requests(status);
CREATE INDEX idx_fertilizer_batches_item ON fertilizer_batches(item);
CREATE INDEX idx_stock_movements_batch ON stock_movements(batch_id);
CREATE INDEX idx_grade_rates_effective ON grade_rates(effective_date DESC);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_name);
