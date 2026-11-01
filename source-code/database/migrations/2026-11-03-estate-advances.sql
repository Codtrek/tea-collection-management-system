-- Estate-Owner-Advances-Addendum §1 — a data-driven `estateAdvances` permission module for the
-- new Finance → Estate Owner Advances sidebar entry. Each role starts at its current Estate Owner
-- level, so nobody's access changes on day one; ADM-02 can then tune it separately.
BEGIN;

INSERT INTO role_permissions (role, module, level)
SELECT role, 'estateAdvances', level
FROM role_permissions
WHERE module = 'estateOwners'
ON CONFLICT (role, module) DO NOTHING;

COMMIT;
