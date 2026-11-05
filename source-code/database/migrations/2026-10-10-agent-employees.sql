-- ════════════════════════════════════════════════════════════════
-- Tea Collecting Agent as an Employee role (link, don't replace)
-- Spec: docs/specs/Collection-Agent-Dispatch-Addendum.md §11
--
-- `employees` (the HR roster behind /employees/new) becomes the source of truth for WHO IS
-- AN AGENT and whether they are active; `collection_agents` stays dispatch's identity
-- (route_assignments / pings / day status are keyed on it) and gains a link to the employee.
--
-- Targeted migration (NOT a reset), idempotent, one transaction:
--   PGOPTIONS='-c search_path=tea_authslice' psql -d nestjs_db -v ON_ERROR_STOP=1 \
--     -f source-code/database/migrations/2026-10-10-agent-employees.sql
-- ════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE collection_agents
    ADD COLUMN IF NOT EXISTS hr_employee_id INTEGER UNIQUE REFERENCES employees(id);

-- A login provisioned by registration starts with a one-time temporary password.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Give every existing agent an Employee record and link it. The job title below must match
-- AGENT_JOB_ROLE in backend/src/employees/employee-roles.ts (SQL can't import the constant).
-- An employee that already has the agent's NIC is linked instead of duplicated.
DO $$
DECLARE
    a   RECORD;
    eid INTEGER;
BEGIN
    FOR a IN
        SELECT ca.id AS agent_id, fe.name, fe.nic, u.id AS user_id, u.phone
        FROM collection_agents ca
        JOIN factory_employees fe ON fe.id = ca.employee_id
        JOIN users u ON u.id = fe.user_id
        WHERE ca.hr_employee_id IS NULL
    LOOP
        SELECT id INTO eid FROM employees WHERE nic = a.nic;
        IF eid IS NULL THEN
            INSERT INTO employees
                (user_id, name, nic, contact, role, department, hire_date,
                 employment_type, status, has_login)
            VALUES
                (a.user_id, a.name, a.nic, a.phone, 'Tea Collecting Agent', 'Logistics',
                 DATE '2026-01-01', 'Permanent', 'Active', TRUE)
            RETURNING id INTO eid;
        END IF;
        UPDATE collection_agents SET hr_employee_id = eid WHERE id = a.agent_id;
    END LOOP;
END $$;

COMMIT;
