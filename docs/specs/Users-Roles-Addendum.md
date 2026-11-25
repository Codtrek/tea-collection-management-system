# Users & Roles — Addendum

**Decided:** 2026-11-18
**Status:** built on `feat/users-roles` (from `dev`), local only. Migration `1794400026000-UsersRoles`.
**Amends:** ADM-02 Users & Roles (both tabs), portal sign-in, the audit log (ADM-04), and how every portal request is authenticated.

## 1. Why

ADM-02 was a thin editor, and the access model behind it had real holes:

| What was wrong | Effect |
|---|---|
| The portal JWT (7 days) was trusted as-is: no DB check per request; the role came from the token claim | A suspended user, or one whose role changed, kept full access until the token expired |
| No create / edit / reactivate; "Reset password" only wrote an audit row saying a link was sent | Users could only be made with SQL; a suspension was one-way; the audit trail said something that didn't happen |
| The Administrator could set itself to Approve on the separation-of-duties keys | It could grant itself the duty it is meant to audit |
| The matrix save took any `module` string, had no transaction, and audited only "N cell(s) saved" | No record of what changed, from what, or why |
| The matrix was roles × 17 columns, with "No Access" / "View + Edit" labels | Unreadable at laptop widths; nothing said why a cell was locked |
| A database built from migrations alone had no rows for 14 keys | Every server check on them answered `none` |
| No lockout; `/auth/agent/login` was outside the 5/min sign-in limit; the throttler logged raw phone numbers | Password guessing was cheap; phones in stdout |

## 2. Data (migration `1794400026000-UsersRoles`, mirrored in `database/init.sql`)

- `users.token_version INT NOT NULL DEFAULT 0`: bumped on deactivate, role change, password reset and password change.
- `users.email VARCHAR(120)`: optional, unique case-insensitively (`users_email_lower_key` on `lower(email)`, an expression index the entity marks `synchronize: false`).
- `users.failed_login_count INT NOT NULL DEFAULT 0` and `users.locked_until TIMESTAMPTZ`: the lockout (§7).
- `audit_logs.before JSONB`, `after JSONB`, `reason TEXT`.
- **Backfill:** `role_permissions` rows for dashboard, collection, fertilizer, estateOwners, estateAdvances, payroll, advances, employees, attendance, reports, dispatch, grading, gradingApproval and administration, at the seed defaults, `ON CONFLICT DO NOTHING`. Existing choices are never changed.
  - **Pre-check on a live DB:** `SELECT module, count(*) FROM role_permissions GROUP BY module ORDER BY 1;`. Modules that already have their rows are untouched.
- `seed.ts` now inserts the matrix with `ON CONFLICT DO NOTHING` (it used to overwrite a factory's own choices on every re-seed).

## 3. The permission matrix

**Keys and labels** live in one place: `admin/src/features/admin/permission-catalog.ts`. The matrix, its review list and the Profile page all read them.

| Section | Rows (label → key) |
|---|---|
| Operations | Tea leaf collections (`collection`) · Agent dispatch (`dispatch`) · Grade deliveries (`grading`) · Approve grading corrections (`gradingApproval`) · Fertilizer stock and requests (`fertilizer`) · Approve fertilizer requests (`fertilizerApproval`) · Approve fertilizer requests above the quantity limit (`fertilizerManagerApproval`) |
| Finance | Estate owners and settlements (`estateOwners`) · Estate owner advances (`estateAdvances`) · Daily expenses (`expenses`) · Fertilizer item prices (`itemPrices`) · Pay rates and pay changes (`payRates`) |
| People | Employee records (`employees`) · Holiday calendar (`holidayCalendar`) · Poya and public holidays (`holidayStatutory`) |
| Reports | Reports (`reports`) |
| Administration | Factory administration (`administration`) |

**Levels:** None < View < Edit < Approve, each including the one before. They are always shown by full name, never blank.

**Added as rows (2026-11-25, §4a):** Dashboard (`dashboard`, Operations), Payroll (`payroll`) and Salary advances (employees) (`advances`) under Finance, Attendance and leave (`attendance`) and Performance (`performance`) under People. Every key in the code is now a matrix row.

**Modules with no key of their own:** settlements (borrow `estateOwners`), pay changes (`payRates`), Users & Roles / Audit Logs / System Settings / Factory Setup (`administration`), holiday import (`holidayStatutory`), agent mobile logins (none; handled in Employees). Leave doesn't exist as a module.

**Locks** (server: `cellLock` in `backend/src/admin/admin-map.ts`; the portal mirrors it):
- **Pinned:** the Administrator column on every key except the separated ones. It is always Approve and not editable, because the factory must always have one unrestricted account. The portal shows a lock and a tooltip.
- **Capped:** the Administrator column on the **separated keys** (`grading`, `gradingApproval`, `fertilizerApproval`, `fertilizerManagerApproval`, `expenses`). Only None or View is allowed: the Administrator audits these duties and never performs them.
  - To move a duty, set the Manager or Officer cell, or give someone the Manager role (Add user / Edit user).
  - Nobody can change their own role, and one person can hold only one login (§5), so the Administrator can't route around the cap.
- **Candidates reported but not changed:** `advances` (Officer and Administrator both default to Approve) and `attendance` (the Manager approves leave). Decide whether they join the separated list.

**Saving** (`PUT /admin/permissions`, `AdminService.updatePermissions`):
- `module` must be a known key (400 otherwise).
- A locked cell is refused with 403, even when unchanged. The portal never sends locked cells.
- The request is diffed against the DB; only changes are written, in one transaction.
- **A reason is required** when any change has `approve` on either side, or touches a finance key: payroll, advances, estateOwners, estateAdvances, expenses, itemPrices, payRates, reports.
- One audit row per save: `details` = "Officer · dispatch: view → edit; …", plus `before`, `after` and `reason`.

**Portal** (`PermissionMatrixTab.tsx`):
- Rows are keys grouped by section, with a search box.
- The header row and the first column are sticky.
- Selects are at least 120px wide. A Playwright check at 1280, 1366 and 1440 px confirms no level name is clipped.
- Each row has an info tooltip and a one-line description, plus a legend.
- Changed cells are tinted and say "was View".
- A sticky bar shows "N changes not saved", with Discard and Review changes.
- The review modal lists "Officer · Daily expenses: Edit → View" and requires the reason when needed.
- Below 1024 px, role tabs show one role column at a time.

## 4. How fast a change takes effect

Every portal request re-reads the user (`JwtStrategy.validate`, then `auth/session-check.ts` `checkPortalSession`). This is one primary-key lookup per request, deliberately not cached.

| Change | Takes effect |
|---|---|
| Matrix reduction (or raise) on a key the server checks | **The user's next request.** Matrix checks read `role_permissions` live; nothing is cached |
| Role change | Next request: the role handed to controllers comes from the DB, not the token. `token_version` is also bumped, so the user signs in again |
| Deactivate / reset password / change password | Next request: `token_version` is bumped, and a token whose `tv` differs gets a 401 |
| Temporary password | Every route except `/auth/me` and `/auth/change-password` returns 403 `PASSWORD_CHANGE_REQUIRED` |
| Portal UI | Re-reads `/auth/me` when the window regains focus (at most every 30 s) and after any 403, so menus catch up without a sign-out |

- Tokens issued before this release carry no `tv`. They match `token_version = 0` until it is first bumped.
- **Reads:** every portal GET checks its key (§4a), so a matrix change applies to reads on the next request.
- **Caveat (writes):** about 32 write endpoints still use hard-coded role rules, so for them a matrix change affects only the UI. See §9.

## 4a. Server checks on reads, rate limits and agent sessions (2026-11-25, `feat/read-permissions`)

### Read permissions
- Every portal GET carries `@RequirePermission(...keys)` or `@PortalOnly()` (`backend/src/auth/permissions.ts`). After authentication, `JwtAuthGuard` reads `role_permissions` for the caller's role (from the DB) on every request, with no cache. Too low a level gives 403: "Your role can't view Payroll. Ask your Factory Administrator if you need access."
- Several keys mean **any of them** is enough. This is for lookups that several pages share.
- `permissions.coverage.spec.ts` fails if a portal GET has neither decorator.
- The portal mirrors it: `AccessGuard` (`admin/src/components/layout/AccessGuard.tsx`) wraps every route in `App.tsx` with the same keys, so a typed URL shows "You don't have access to this page".

| Endpoints | Key(s), View or higher |
|---|---|
| `admin/*`, `audit` | administration |
| `collections/*` | collection |
| `dispatch/*` (portal) | dispatch; `estates/:id/route-agent`: + estateOwners, collection |
| `employees`, `employees/:id`, `employees/roles` | employees, attendance, payroll, advances, payRates, performance |
| `employees/:id/collections`, `/fertilizer-deliveries` | employees |
| `employees/attendance*` | attendance |
| `employees/advances*`, `employees/:id/advances` | advances |
| `employees/payroll*` | payroll |
| `employees/pay-rates`, `pay-adjustments` | payRates; `employees/:id/pay`: payRates, payroll |
| `estates`, `estates/directory` | estateOwners, estateAdvances, collection, dispatch, fertilizer |
| `estates/:id/*`, `estates/settlements*` | estateOwners; `:id/lifetime`: + fertilizer |
| `estates/advances*`, `estates/:id/advances`, `:id/advance-context` | estateAdvances |
| `fertilizer/*` | fertilizer; `prices`: itemPrices, fertilizer; `prices/costs`: itemPrices |
| `holidays/*` | holidayCalendar, holidayStatutory, attendance; `holidays/import/*`: holidayStatutory |
| `performance/*` | performance |
| `reports/collection`, `reports/leaf-purchases` | reports |
| `reports/expenses*`, `reports/expense-categories` | expenses, reports |
| `dashboard/summary` | dashboard |
| `auth/me`, `auth/mobile/me`, `auth/change-password` | any signed-in portal user |

With the default matrix only the Officer has None on any key (`administration`, `payRates`, `performance`), so default roles lose nothing they used.

### Rate limits (`app.module.ts`, `auth/identity-throttler.guard.ts`)
| Limit | Value | Counted per |
|---|---|---|
| short | 60 / 10 s (was 15) | signed-in user; before sign-in IP + account, or IP |
| medium | 120 / min | signed-in user (was IP); IP before sign-in |
| long | 600 / 10 min | signed-in user (was IP); IP before sign-in |
| auth | 5 / min | IP + account, on the sign-in and register routes |

### Agent sessions (`auth/agent-session.ts`)
- Agent tokens carry `tv` (`users.token_version`) and **expire in 30 days**.
- `AgentJwtStrategy` re-reads the user on every request:
  - missing, not an agent or suspended → 401;
  - a `tv` mismatch → 401 "Your session has ended. Please sign in again.";
  - a temporary password → 403 everywhere except `/auth/agent/change-password` and `/auth/agent/logout`.
- **Sliding:** once a token is over a day old, every **successful** agent response carries a fresh 30-day token in `X-Session-Token` (`AgentSessionInterceptor`, exposed via CORS). Refused, revoked or failed calls never get one.
- **Revocation:** `token_version` is bumped by the password change (`POST /auth/agent/change-password` returns `{ ok, accessToken }` for this device), by the new `POST /auth/agent/logout`, and by deactivation.
- Tokens from before this release have no `tv` (it counts as 0) and expire after 7 days as before. Nobody is signed out by the deploy, and the first successful call after a day upgrades the token.

## 5. System users

**Endpoints:** all `/admin/users…`, in `SystemUsersService` with pure rules in `admin/user-rules.ts`.

| Endpoint | What |
|---|---|
| `GET /admin/users` (`administration: view`) | Portal logins (factory_admin / officer / manager only). Each row has name, phone, email, role, linked employee, status (Active / Inactive / Locked), last login, `isSelf`, and per-action refusal reasons |
| `GET /admin/users/eligible-employees` | HR employees who can get a login (Active, no `user_id`, not a Tea Collecting Agent, NIC not already a login), plus the roles the caller may assign |
| `POST /admin/users` | Create from an HR employee: name and NIC come from the record, the phone defaults to its contact. Writes `users`, `factory_employees` and `employees.user_id` in one transaction. Returns the temporary password **once** |
| `PATCH /admin/users/:id` | Name, phone, email, role (with an optional reason). A role change bumps `token_version` |
| `POST /admin/users/:id/deactivate` (`/suspend` is kept as an alias) | Optional reason; bumps `token_version` |
| `POST /admin/users/:id/reactivate` | |
| `POST /admin/users/:id/reset-password` | New temporary password, returned once; forces a change; bumps `token_version`; clears any lock |
| `POST /admin/users/:id/unlock` | Clears a lockout early |
| `GET /admin/users/link-suggestions`, `POST` / `DELETE /admin/users/:id/link` | NIC-matched proposals. A link is only made on confirmation, and only when the NICs match |

**Rules** (server-side; the portal disables the control and shows the server's reason in a tooltip):
- Nobody can change their own role or status, or reset their own password here (they use change-password instead).
- The last active Administrator can't be deactivated or demoted.
  - **Honest note:** with per-request checks, only an active Administrator can act, and acting on yourself is already refused. So this rule can't be reached today. It stays as defence in depth (e.g. if user management is ever delegated) and is unit-tested.
- Only an Administrator manages users and assigns or changes the Administrator role. No new permission key was added for user management.
- **One person, one login:** `factory_employees.nic` and `employees.user_id` are both unique, and Add user also refuses (409) an employee whose NIC already has a login. Nobody can hold a second account, e.g. a Manager login, that would get around the NIC-based no-self-approval checks.

**Temporary passwords:**
- 12 characters from `randomBytes(9)` as base64url (about 72 bits), bcrypt cost 10.
- Never stored or logged in plain text, and never in the audit trail.
- The portal shows it once in a dialog with Copy. The mutation uses `gcTime: 0`, so the query cache never keeps it.
- First sign-in goes to `/change-password`. The server refuses everything else until the change is made.

**Agents' mobile logins:**
- Same `users` table, `role = 'collection_agent'`. They are provisioned by `AgentProvisioningService` from Employees.
- They aren't listed because the list keeps only the three portal roles.
- **Proposal, not built:** a read-only "Mobile (agents)" tab with name, phone, linked employee, route, status, last login and the must-change flag. Actions would be Reset password and Open employee. Deactivate and reactivate stay in Employees, so the HR status and the login can't drift.

## 6. Passwords

- `POST /auth/change-password` (portal): current password + new (8–72 characters, different from the current one).
  - Bumps `token_version`, so every other session ends.
  - Returns a fresh token for this session.
  - Audited.
- The login and `/auth/me` responses carry `user.mustChangePassword`. The portal routes to `/change-password` (outside the shell) while it is set.

## 7. Lockout

- 5 wrong passwords in a row set `locked_until = now + 15 min` and reset the count. The lock is audited as the actor "System".
- While locked, even the right password is refused ("Try again in N minutes").
- It unlocks automatically when the time is up.
- A successful sign-in resets the count.
- An Administrator can unlock early (audited).
- The same gate covers portal, mobile and agent sign-in. The 5/min sign-in throttle stays, and now covers `/auth/agent/login` too.
- A lock blocks sign-in only. It doesn't end existing sessions; deactivation does.
- The status shows Locked while `locked_until > now`.

## 8. Audit

- `AuditService.record` accepts `before`, `after` and `reason`. ADM-04 shows the reason under the details.
- Ids still come from `count()+1`, but a primary-key clash (23505) now retries with the next id instead of losing the row.
- **Newly audited:** user created / edited / role changed / deactivated / reactivated / unlocked / linked / unlinked, password reset (the real one), own password changed, automatic lock.

## 9. Open items

1. ~~Read endpoints with no permission check~~: done in §4a (2026-11-25).
2. **Writes on hard-coded role rules (the next PR).** All 95 portal write endpoints have *some* check, but about 32 ignore the matrix:
   - Collections (8: update, exception entry, grade lines, finalize, correction request/approve/reject, resend notification): "Managers are read-only".
   - Estates and settlements (10: create, update, deactivate, issue advance, repayment, reschedule request/decision, prepare, exclude delivery, process): "Managers are read-only".
   - Employees (11: create, update, deactivate, mark attendance, salary advance request/decide/repay/reschedule, payroll generate/process): "Managers are read-only".
   - Admin (5: grade rates and transport rates create/cancel, factory profile): "Administrator only".
   - Already matrix-driven: fertilizer, dispatch, holidays, pay rates/changes, expenses, performance notes, users/permissions/settings.
   - Moving these needs the right level per endpoint (edit vs approve), and some current rules differ from the matrix defaults. For example, the Manager has `attendance: approve` but the code blocks Managers.
3. Whether `advances` / `attendance` become separated keys.
4. The "Mobile (agents)" tab (§5).
5. Login error messages still say whether a phone number is registered. `/auth/mobile/register` is public: please confirm that's intended.
6. **E2E note:** every Playwright worker shares the one admin token. The short limit is now 60 / 10 s (§4a), and session hydration signs out only on a 401.
   - On 2026-11-25, two of three full `users-roles` + `layout` runs (2 workers) still had 4 timeouts each, on different pages each time (holidays, then payroll). In each case the page had been signed out.
   - In a monitored green run, the admin's `token_version` and status never changed. The source of that 401 isn't found yet; it's tracked in issue #101.
7. `GET /auth/mobile/me` sits behind the portal guard, which refuses estate owner/manager tokens (since #100). Check whether the mobile app relies on it.
