# Tea Collection Management System — Project Context

This file gives an AI coding assistant the working context needed to write code consistent
with the finalized design decisions for this project. It reflects design sessions held after
the original project proposal was written — where this file conflicts with the proposal PDF,
**this file is authoritative** for implementation purposes.

**Maintenance note:** this file was rebuilt from scratch on this branch
(`feature/UI-web-portal-extended`) on 2026-07-17, keeping the durable design-decision content and
replacing the implementation-status section with what's actually true here. As of 2026-07-20 the
branch `hasindu/mobile/test01` is **abandoned as a failed branch** — nothing is taken from it, and
all backend/database/mobile work is built fresh on this branch. Earlier versions of this file
described reconciling with it; that is no longer the plan. Updated 2026-07-22 to record the
Authentication vertical slice (committed on `feature/auth-slice`) and the Fertilizer
stock-position rework + dev-CORS fix (committed on `feature/fertilizer-stock-position`). Updated
2026-07-26 to record the Tea Leaf Collection vertical slice (`feature/collections-slice`) — the
first full DB→backend→portal slice built after auth, per `PLAN.md` Phase 2.1. Updated again
2026-07-26 to record the Estates + Payments vertical slice (`feature/estates-payments-backend`,
`PLAN.md` Phase 2.2) and resolve the ~Rs. 3 bank-charge open item. Updated again 2026-07-26 to
record the Employees + Payroll vertical slice (`feature/employees-payroll-backend`, `PLAN.md`
Phase 2.3) — the first slice with a genuinely new table (`employees`, independent of the
auth-side `factory_employees`) and the first to implement live payroll computation rather than
a snapshot/seeded value. Updated 2026-07-27 to record the Fertilizer vertical slice
(`feature/fertilizer-backend`, `PLAN.md` Phase 2.4) — resolved the last open business question
(ad-hoc vs request-linked dispatch: both allowed) and the fourth module to prove the recipe,
this time extending a pre-existing table in place rather than building fresh or splitting a
new one. Updated again 2026-07-27 to record the Reports vertical slice
(`feature/reports-backend`, `PLAN.md` Phase 2.5) — the fifth module, and the first that's mostly
pure aggregation (no new tables for RPT-01/02) with one greenfield write path (RPT-04's
`expense_entries`). Updated 2026-07-28 to record the Administration vertical slice
(`feature/administration-backend`, `PLAN.md` Phase 2.6) — the **sixth and final web-portal
module**: the permission matrix is now server-driven (`role_permissions`), grade rates are a
real effective-dated table (`grade_rates`), system settings persist (`system_settings`), and a
cross-cutting `AuditService` writes a real `audit_logs` row on every mutation across all six
modules. With this, **zero web-portal modules remain on mock fixtures** — only Phase 3 (Mobile)
is left.

## What this system does

Digitizes Sri Lanka's manual, paper-based tea collection workflow: from leaf plucking at the
estate, through factory pickup and receiving, to monthly payment calculation. Replaces phone
calls and paper records with a coordinated mobile + web system.

## Stack

- **Mobile app**: React Native (Expo), offline-first via SQLite, syncs to backend when online
- **Web portal**: React 19 + Vite 8 + Tailwind CSS v4
- **Desktop app**: planned, not yet architected (added after original proposal — scope/role
  mapping still open)
- **Backend**: NestJS (Node.js), REST API
- **Database**: PostgreSQL (primary), SQLite (mobile offline), Redis (caching)
- **Auth**: JWT, role-based access control
- **Storage**: Cloudinary (photo evidence)
- **Maps**: Google Maps API (static route/proximity display, not live tracking)
- **i18n**: English, Sinhala, Tamil (react-i18next) — mobile only; the web portal ships
  English-only in v1 (see `source-code/admin/AGENTS.md`)

## User roles (system logins)

Only roles that create, approve, or consume workflow data get accounts:

- Tea Estate Owner
- Tea Estate Manager
- Tea Collection Agent ("collector")
- Tea Receiving Officer
- Factory Administrator
- Factory Officer
- Factory Manager
- Employee (self-service portal only — salary history, advances, payslips)

All other org-chart roles (Machine Operators, Drivers, Quality Control staff, Store Keepers,
etc.) are **HR records only** — no login, no permissions, exist purely for payroll/attendance.
The web portal's permission model (`source-code/admin/src/context/permissions.ts`) only
implements the three factory-side roles (Administrator/Officer/Manager); estate-side and
collector-side roles are mobile-only.

---

## Core domain model: Route Management vs. Pickup Management

This is the central architectural decision of the system. **Do not conflate these two.**

### Route Management (factory-controlled)

A `Route` represents one truck's plan for one day: which truck, which collector, which driver,
which estates get visited, in what order.

**Route status** (factory sets these, not the collector):
`SCHEDULED → ACTIVE → COMPLETED`, with `DELAYED` and `CANCELLED` as factory-triggered branches
requiring a reason (e.g. "Heavy Rain", "Road Closed", "Vehicle Breakdown").

- Factory creates the route in the morning → `SCHEDULED`
- **Collector** presses "Start Route" → `ACTIVE` (this is the *only* route-status action a
  collector can take — everything else is factory-only)
- Factory can set `DELAYED` or `CANCELLED` at any time before completion; this is **manual only**,
  never system-inferred
- `CANCELLED` blocks all new pickup requests against that route for the day
- All estates on the route get notified on `ACTIVE`, `DELAYED`, and `CANCELLED` transitions

A `RouteStop` belongs to a route and an estate, and can have `has_tea_pickup` and/or
`has_fertilizer_delivery` — fertilizer delivery is **not** a separate workflow, it's a flag on
the same stop.

### Pickup Management (estate-controlled)

A `PickupRequest` is created by an estate owner and is independent of route status — a route
being `ACTIVE` does **not** mean every pickup on it is resolved.

**Pickup status**: `PENDING → ACCEPTED → ON_THE_WAY → PICKED_UP → COMPLETED`, with `EXPIRED` and
`CANCELLED` branching off `PENDING`.

- Owner selects a **factory** (not a specific collector) when creating a request
- **Auto-assignment**: system matches the request to whichever collector is `ACTIVE` on the
  estate's route — the owner never picks a person directly
- **One active pickup request per estate per day.** A new request to a different factory can
  only be submitted after the current one is `EXPIRED` or `CANCELLED` — no parallel requests
- Response deadline: if the collector doesn't accept/decline in time, system auto-expires it
  and notifies the owner, who may then try another factory
- Collector can accept or decline an *individual stop* (not the whole route) with a required
  reason on decline

### Why decoupled

Keeps factory-level logistics (trucks, routes, drivers) cleanly separate from estate-level
interactions (requests, weights, confirmations). Reduces contention and makes each side's state
machine independently reasoned-about.

---

## Weight verification (no OTP/SMS, anywhere)

The proposal originally mixed OTP-based and photo-based verification across different diagrams —
this was resolved: **photo evidence only, everywhere**, because SMS/OTP is unreliable in rural
areas with poor signal. Do not reintroduce OTP/SMS confirmation steps.

Sequence:
1. Collector measures weight, enters it in the app
2. **Estate owner confirms on the collector's device** (taps Confirm on the agent's phone screen)
   — not a text message, not a network round-trip, works fully offline
3. Photo evidence of the scale/weighing is captured (uploads to Cloudinary if online, queues
   locally if offline)
4. At factory receiving, the Receiving Officer re-weighs and the Receiving Officer assigns a
   tea grade (`Super` or `Normal`) at the same step
5. If collected weight vs. factory weight differs beyond a configured threshold → system
   **auto-generates a complaint** (do not just store both numbers silently)

## Offline behavior

Two distinct problems, don't conflate them:

1. **User is offline and can wait** → standard offline-first pattern. Data (collection records,
   photos, pickup requests) is written to local SQLite with a `QUEUED_OFFLINE` status, synced
   automatically when connectivity returns, then promoted to real system status (e.g.
   `QUEUED_OFFLINE` → `PENDING` for a pickup request, which only then enters route-matching).
2. **User is offline and needs a collector *today*** → auto-assignment logic runs server-side
   and cannot function without connectivity. Fallback: cache the estate's usual/assigned
   collector's phone number and the factory dispatch line locally (refreshed opportunistically
   whenever online), and surface a "no connection — call your collector directly" screen. This
   maps to the pre-existing phone-call-based pickup method (see below), not a new mechanism.

GPS note: capturing a coordinate does **not** require internet (device GPS chip works offline).
Only rendering map tiles does. So the pickup location pin should always be captured, online or
not — just skip the visual map preview until connectivity returns.

## Manual / offline collection records (phone-arranged pickups)

Some estate owners have a personal relationship with a specific collector and just call them
directly, bypassing the app entirely. This is legitimate and expected, not an edge case to
eliminate. To keep these estates in the payment calculation pipeline, the collector can create a
**manual collection record** after the fact — same fields as a normal completed pickup (estate,
weight, photo), just created directly with `status = COMPLETED` and no preceding
`Pending/Accepted` history.

---

## Payment calculation

```
Gross Revenue = (Super Tea Weight × Super Rate) + (Normal Tea Weight × Normal Rate)
Net Payable   = Gross Revenue − Transport Cost − Fertilizer Deductions − Advance Payments
```

- Transport cost is **skipped entirely** for estates that self-deliver to the factory
  (`self_delivered` flag on the collection record)
- Fertilizer deductions come from approved fertilizer borrowings (fertilizer is requested/
  approved separately from the tea-pickup flow, but *delivered* via the same route stop)
- Advance payments are owner-requested before month-end, tracked with request date/amount/status
- Output: a payment statement per estate per month, exportable as Excel/CSV/PDF for bank
  submission

Employee payroll follows a parallel but separate calculation: shift-based pay (Day/Day OT/
Night/Night OT, different rates), with employee-requested salary advances deducted at month end,
also exportable as a bank payment file. **Implemented 2026-07-26** (Employees + Payroll vertical
slice) — each employee carries four hourly rates; a payroll "generate" step aggregates that
period's `employee_attendance` rows into hour buckets and multiplies by the employee's rates
*at generation time* (snapshotted onto the row, so a later rate change never alters a past run);
"process" then finalizes Pending rows the same way settlements do (missing-bank exclusion,
advance-deduction flip). This is more live computation than Estates' settlements, which stayed
snapshot-only because their inputs (`grade_rates`, fertilizer) don't exist yet — here the inputs
(rates, attendance) were built in the same slice.

The ~Rs. 3 per-transaction bank charge is **not deducted from any payee** (resolved 2026-07-26,
Estates + Payments slice): estate owners and employees are never charged a per-transaction fee.
Instead the **factory** is billed a separate periodic platform fee (6-monthly or annually) —
that's SaaS billing, unrelated to the tea settlement/payroll math above, and out of scope for the
payment calculation itself. Earlier drafts of this file described this charge as a per-transaction
deduction from net payable; that direction was superseded by this decision.

---

## Deferred / explicitly out of scope

- **Collector quota/constant-weight penalty system**: if a factory expects a set weight from a
  collector and they under-deliver, some factories dock the collector's own pay. This is a real
  business rule but is **deferred to a future phase** — don't build it into v1's payment schema,
  though the schema should be extensible enough to add it later as another deduction line item.
- **Live GPS/vehicle tracking**: only static route visibility and one-time pickup-location pins
  are in scope. Continuous location tracking is explicitly out of scope.
- **SMS-gateway-based request submission**: raised as a possible offline fallback but would
  require new infrastructure (SMS gateway) — treat as a stretch goal, not core scope.
- **Web portal dark mode**: tokens are structured to make it a single-file add later, but v1
  ships light-mode only (see `source-code/admin/AGENTS.md`).

## Key entities (for schema design)

```
Factory, Route, RouteStop, PickupRequest, Estate, Collector, Truck,
CollectionRecord, TeaGrade, Complaint,
Employee, SalaryAdvance, Attendance,
MonthlyPayment, PaymentDeduction, PaymentStatement
```

Notable fields worth preserving in any implementation:
- `Route.status_reason` — required whenever status is `DELAYED` or `CANCELLED`
- `PickupRequest.gps_pin` — captured offline-capable, distinct from live tracking
- `PickupRequest.estimated_weight` vs `CollectionRecord.actual_weight` — both stored, mismatch
  triggers `Complaint` when beyond threshold
- `CollectionRecord.self_delivered` — boolean, skips transport deduction
- `CollectionRecord.owner_confirmed` — on-device confirmation flag, separate from photo evidence

---

## Implementation status (this branch: `feature/UI-web-portal-extended`, as of 2026-07-18)

**Web portal (`source-code/admin/`) — ALL SIX MODULES UI-COMPLETE as of 2026-07-18.** React 19 +
Vite 8 + Tailwind v4. Design-token foundation (hybrid Harboost palette: brand green `#53cf81`
for accent/logo/charts, darkened `#1b8b4e` for AA-safe interactive primary) validated at
`/design-foundations` (FND-01). Built 2026-07-17: Global screens (Login, Dashboard, Notification
Center, Search, Profile) + Employee Management (EMP-01..14). Built 2026-07-18: Fertilizer
Inventory (FERT-01..04, new `AlertList` pattern), Tea Estate Owner (EST-01..09, two
HighStakesConfirmFlow uses: issue-advance and settlement processing with expandable
gross/transport/fertilizer/advance breakdown), Tea Leaf Collection (COL-01..04, new
`PhotoEvidenceGallery` pattern; COL-02 is a provisional "Pending Agent Confirmation" exception
entry, NOT a weight override — preserves the agent-entered-weight constraint §7.1; Confirmed
records are locked with a Flag-for-Correction audit path), Reports & Analytics (RPT-01..04,
shared `ReportViewer` + `ReportActionsBar`; RPT-04 Daily Expense Entry fills the §8.1.6 gap),
Administration (ADM-01..04 behind `AdminGuard`: Factory Setup with VERSIONED grade-rate history,
Users & Roles with the editable permission matrix that the data-driven `permissions.ts` model
was built for, System Settings, read-only Audit Logs). Design decisions honored in the build:
the ~Rs. 3 bank charge is never deducted from estate owners or employees (resolved 2026-07-26 —
see Payment calculation above); grade rates are versioned by effective date so past settlements
never recalculate; reports aggregate Confirmed collection records only. Permissions stay
data-driven (`src/context/permissions.ts`).
Most data is still mock (`features/*/data.ts`), shaped to match a future REST contract — wiring the
remaining modules to the real backend is the remaining web-portal work. `ComingSoon` stub was
removed. Build + lint clean. See `source-code/admin/AGENTS.md` for conventions.

**Auth is now wired to the real backend (2026-07-21, `feature/auth-slice`).** The data-fetching
seam the roadmap called for now exists: `src/lib/api.ts` (typed `ApiError`, attaches the JWT,
maps 401 → logout, and turns a network failure into a diagnostic "backend unreachable" message)
plus `src/services/auth.ts`. `AuthContext` performs real JWT login and hydrates the session via
`GET /auth/me` on load. Login is **phone + password** (not email), with per-field validation and a
password-reveal (eye) toggle in `LoginPage`.

**Fertilizer Inventory reworked (2026-07-22, `feature/fertilizer-stock-position`, committed).**
Per the fertilizer addendum, the module now distinguishes **On hand ≠ Available**
(`Available = On hand − Committed − Expired`) to prevent over-commitment. The
`onHand − committed` math lives in exactly one place — the single-source-of-truth
`features/fertilizer/position.ts`. Added the request workflow: FERT-05 request queue, FERT-06
request detail (approval with FEFO allocation + override), FERT-07 log-phoned-in request; plus
FERT-02 (stock movement now request-linked unless ad-hoc + reason) and FERT-04 (alerts show
demand coverage) amendments, with routing and a "Fertilizer Requests" nav item. Still mock data —
not yet backend-wired.

**Tea Leaf Collection wired to the real backend (2026-07-26, `feature/collections-slice`) — the
first complete DB→backend→portal vertical slice built after auth, per `PLAN.md` Phase 2.1.** All
four screens (COL-01 list, COL-02 exception entry, COL-03 detail, COL-04 edit) now read/write
through TanStack Query + `src/services/collections.ts` instead of `features/collections/data.ts`.
Server-side enforces exactly what the UI already implied: Confirmed records are locked (edit →
409, must Flag for Correction instead); grade can only be set once status is Collected; Manager
role is read-only (403 on any write); exception entries always land as **Pending Agent
Confirmation** with no authoritative weight (§7.1). `features/collections/data.ts` is
**intentionally kept** — `features/estates/EstateDetailPage.tsx`'s `collectionsForEstate` still
depends on it until the Estates module (2.2) is wired.

**Estate Owner wired to the real backend (2026-07-26, `feature/estates-payments-backend`) —
`PLAN.md` Phase 2.2, second module after Collections.** All nine screens (EST-01 list, EST-02
registration, EST-03 detail, EST-04 edit, EST-05 advance list, EST-06 issue advance, EST-07
settlement list, EST-08 process settlement) read/write through `src/services/estates.ts` instead
of `features/estates/data.ts`. Route assignment is server-side (least-loaded of the seeded routes
— no geo data exists yet to route by estate location) and stays read-only after registration, per
the architecture decision. Server-side enforces what the UI already implied: register/deactivate
are Administrator-only (403 otherwise); Manager is read-only on every write; settlement
processing excludes missing-bank estates rather than blocking the run (UC-054) and flips the
processed estates' pending advances to Deducted; re-processing when nothing is eligible → 409.
**The ~Rs. 3 bank charge is resolved**: no per-transaction deduction anywhere in the settlement
math — see Payment calculation above. Settlements are **process-only this slice**: rows are
denormalized with snapshot rate/deduction values (seeded, mirroring the old fixture) rather than
auto-generated from live data, since that needs `grade_rates` (ADM-01, Phase 2.6) and Fertilizer
dispatch linkage (Phase 2.4), neither built yet. EST-09 Analytics stays on mock data (self-
contained charts, no backend dependency). `features/estates/data.ts` is **intentionally kept**
(trimmed to just the `ESTATES` array) — `EstateAnalyticsPage`, `CollectionExceptionEntryPage`, and
Fertilizer's `LogRequestPage` still resolve estate/route/agent from it until those flows wire to
the real API; `grossRevenue`/`netPayable` moved to the new `features/estates/calc.ts`.

**Employees + Payroll wired to the real backend (2026-07-26, `feature/employees-payroll-backend`)
— `PLAN.md` Phase 2.3, third module, "largest surface, fully greenfield."** All thirteen
non-mock screens (EMP-01 list, EMP-02 registration, EMP-03 detail, EMP-04 edit, EMP-05/06/07/08
attendance overview + entry, EMP-09/10 advance list/request/decision, EMP-11/12/13 payroll
list/process/payslip) read/write through `src/services/employees.ts` instead of
`features/employees/data.ts`. Two things this slice does differently from Estates: **roster
writes are Administrator-only end to end** (`employees` permission key is Officer=`view`, not
`edit` — a real difference from Estates where Officer could edit), and **payroll is live-computed,
not seeded snapshot** — a "Generate from Attendance" action aggregates that period's
`employee_attendance` rows × the employee's rates into Pending payroll rows (rates snapshotted at
generation time), then "Process Payroll" finalizes them (missing-bank exclusion, approved-advance
deduction flip), same UC-054-style exception handling as settlements. The registration/edit forms
gained a "Pay rates (Rs./hour)" section (Day/Day-OT/Night/Night-OT) not in the original design doc
mockup — necessary for the live computation to have real inputs. `AttendanceOverviewPage`'s grid
now reads real `employee_attendance` rows instead of a pseudo-random fill function; unmarked days
render as a neutral dot rather than defaulting to Present. `PerformancePage` (EMP-14) stays mock
(self-contained charts, no backend dependency, same call as EST-09 Analytics).
`features/employees/data.ts` is **intentionally kept** (trimmed to just the `EMPLOYEES` array) —
`PerformancePage`'s employee picker still reads it; `netPay` moved to the new
`features/employees/calc.ts`.

**Fertilizer wired to the real backend (2026-07-27, `feature/fertilizer-backend`) — `PLAN.md`
Phase 2.4, fourth module.** All eight screens (FERT-01 stock position + expandable batch rows,
FERT-02 movement entry, FERT-03 batch detail, FERT-04 alerts, FERT-05 request queue, FERT-06
request detail/decision, FERT-07 log-phoned-in request) read/write through
`src/services/fertilizer.ts` instead of `features/fertilizer/data.ts`/`position.ts` — both fixture
files are **deleted this slice** (unlike Estates/Employees, which kept a trimmed fixture for a
still-mock sibling page; Fertilizer had no such holdout). Stock arithmetic (on-hand/committed/
available/coverage) is computed **server-side only**, at `GET /fertilizer/positions` — the client
never recomputes it; `features/fertilizer/lib.ts` keeps only pure *presentation* helpers (expiry
status, FEFO allocation as a display suggestion, request-availability lookups) that read whatever
was last fetched. The resolved business question shows up directly in the data model: an Outgoing
stock movement's `linkedRequest` stays optional — ad-hoc dispatch (no request behind it) and
request-linked dispatch both draw down the same batch ledger, and a linked dispatch advances the
request's `dispatchedQtyKg` and flips its status (Approved → Partially Dispatched → Dispatched).
Decide (approve/reject/cancel a request) is **Administrator-only** — Officer's `edit` level covers
logging requests and recording movements, but not the approval decision itself (a three-way split
that doesn't exist in any other module's permission column).

**Reports wired to the real backend (2026-07-27, `feature/reports-backend`) — `PLAN.md` Phase
2.5, fifth module.** All four screens (RPT-01 Collection, RPT-02 Revenue, RPT-03 Expense, RPT-04
Log Daily Expense) read/write through `src/services/reports.ts` instead of the deleted
`features/reports/data.ts` fixture (`types.ts` kept, per the recipe, plus a small
`REPORT_PERIODS` constant — the five seeded months, Mar–Jul 2026 — since there's no "list
available periods" endpoint). Unlike every prior slice, RPT-01/02 needed **no new tables** —
`ReportsService` aggregates read-only off `tea_collection_records`/`settlements`/`payroll_runs`
(the same second-repository-binding pattern Fertilizer used for `EstateEntity`), so Reports is
the first module that's pure aggregation over other modules' data rather than owning a workflow.
RPT-01 filters to **Confirmed collection records only** (§ reports doc); RPT-02 counts only
**processed** settlements as realized revenue — a period with nothing processed yet (e.g. July,
whose settlements seed as `Pending`) correctly shows zero, not an error. RPT-03's expense split
unions three sources: Payroll (`payroll_runs.gross`) and Fertilizer/Transport
(`settlements.fertilizer_deduction`/`transport_cost`) are **derived** at query time, never
duplicated as rows; only the manual Utilities/Maintenance/Miscellaneous/Other entries RPT-04
logs live in the new `expense_entries` table. Each report endpoint accepts an optional
`?period=YYYY-MM` and **defaults to the latest month with data** when omitted, so the page loads
something real on first render rather than an empty/error state. Fixed a pre-existing permission
gap while wiring RPT-04: `reports` was `'view'` for both Officer and Manager in
`permissions.ts`, which would have shown Manager a "Log Daily Expense" button the backend then
403s — bumped Officer to `'edit'` (matching every other module's Officer-edits/Manager-views
split), so the button now hides for Manager via the existing data-driven `can()` check rather
than a hardcoded role branch.

**Administration wired to the real backend (2026-07-28, `feature/administration-backend`) —
`PLAN.md` Phase 2.6, the sixth and final web-portal module.** All four screens (ADM-01 Factory
Setup, ADM-02 Users & Roles, ADM-03 System Settings, ADM-04 Audit Logs) read/write through
`src/services/admin.ts`; there was no `features/admin/data.ts` fixture to delete (its mock arrays
lived inline in the page files), and the Public* shapes were lifted into a new
`features/admin/types.ts` per the recipe. Two things became server-driven that previously weren't:
- **Permissions are now truly data-driven end to end.** The `role_permissions` table (one row per
  role×module, seeded from the portal's `DEFAULT_PERMISSIONS`) is the runtime source of truth.
  `AuthService.buildPublicUser()` attaches the user's own role map onto `PublicUser.permissions`
  (returned on both login and `/auth/me`); `AuthContext.level()` reads
  `user.permissions?.[module] ?? DEFAULT_PERMISSIONS[...]` — the client constant is now only a
  fallback. `can()`/`level()` signatures are byte-identical, so **no page or guard changed**.
  ADM-02's matrix editor writes back via `PUT /admin/permissions`; the **Administrator row is
  immutable server-side** (a real downgrade attempt 403s — the factory always keeps one
  unrestricted account). Changes take effect at a user's next login (the map is baked into the
  login response, not re-fetched per request).
- **Audit capture is real and cross-cutting.** A shared `AuditService.record(actor, {...})` (in
  the new `AuditModule`, imported by every write module) inserts one `audit_logs` row after each
  successful mutation across Collections, Estates, Employees, Fertilizer, Reports, and Admin. It
  is **best-effort** — wrapped in try/catch so an audit-insert failure can never roll back or
  break the business mutation. `GET /audit` (Administrator-only, matching `AdminGuard`) feeds
  ADM-04. This closed the temporary "no audit_logs table yet" note in `CollectionsService.flag`.

ADM-01 grade rates are a real effective-dated `grade_rates` table (newest `effective_date` is
"current"); because settlements already snapshot their rate at settlement time, adding a new
version never retro-recalculates past settlements. ADM-02's System Users tab lists factory users
by joining `users`+`factory_employees`; **suspend is real** — it flips `users.status` and a
suspended account is then rejected at login (401), and `users.last_login_at` is stamped on each
successful login. Password reset stays a stub (records an audit entry; no email infra until Phase
3). ADM-03 persists to a key/value `system_settings` table. Left static (no backing table this
slice, noted in code): ADM-01's General Info / Transport / Beneficiary Items tabs, and the
audit-log CSV/PDF export button.

**Backend (`source-code/backend/`) — auth, collections, estates, employees, fertilizer, reports,
and administration slices built; all six web-portal modules now backend-wired.**
The default NestJS scaffold (`app.controller.ts`, `app.service.ts`, their spec, and the e2e test)
was **deleted**; `package.json` now depends on TypeORM, pg, @nestjs/jwt, passport-jwt, bcrypt, and
class-validator. Built:
- **Auth** (`src/auth/`): `POST /auth/login` (phone + password → JWT) and `GET /auth/me`; JWT
  payload is `{sub, role}`. Login errors are situational (phone-not-found vs. wrong-password).
  DB-role → app-role mapping in `src/auth/role-map.ts` (`factory_admin→Administrator`,
  `factory_officer→Officer`, `factory_manager→Manager`; non-factory roles are rejected).
- **Users** (`src/users/`): User / Factory / FactoryEmployee entities + service; users are keyed
  by **phone**, not email; the profile join reaches `factory_employees → factories`.
- **Collections** (`src/collections/`): `GET/PUT /collections(/:id)`, `POST /collections`
  (exception entry), `POST /collections/:id/flag`, all JWT-guarded. Business rules (lock, grade
  gate, Manager-read-only, provisional-record creation) live in `collections.service.ts` with unit
  tests in `collections.service.spec.ts`. DB↔portal status/grade mapping in `collection-map.ts`
  (mirrors `auth/role-map.ts`'s pattern) — the DB stores snake_case, the API returns the portal's
  exact `CollectionRecord` shape (Title Case statuses, `photos`/`timeline` as JSONB passed through
  near-verbatim).
- **Estates** (`src/estates/`): `GET/POST/PUT /estates(/:id)`, `PATCH /estates/:id/deactivate`,
  `GET/POST /estates/advances`, `GET /estates/settlements`, `POST /estates/settlements/process`,
  all JWT-guarded. Business rules (Administrator-only register/deactivate, Manager-read-only,
  missing-bank exclusion, advance-flip-to-Deducted, least-loaded route auto-assignment) live in
  `estates.service.ts` with unit tests in `estates.service.spec.ts`. DB↔portal mapping in
  `estate-map.ts` (same pattern as `collection-map.ts`), including `formatEstateId`/
  `parseEstateId` for the `EST-0001`-style business id (formatted from the `estates.id` serial,
  not stored). New estate owners get a `users` row provisioned via `UsersService.createUser`
  (phone-keyed, random password — no distribution flow yet, deferred to mobile login, Phase 3).
- **Employees** (`src/employees/`): `GET/POST/PUT /employees(/:id)`, `PATCH
  /employees/:id/deactivate`, `GET/POST /employees/attendance`, `GET/POST /employees/advances`,
  `PATCH /employees/advances/:id/decide`, `GET /employees/payroll`, `POST
  /employees/payroll/generate`, `POST /employees/payroll/process`, all JWT-guarded. Business rules
  live in `employees.service.ts` with unit tests in `employees.service.spec.ts`:
  Administrator-only roster writes (a stricter gate than Estates — Officer is view-only on the
  roster there too); attendance-mark/advance-decide/payroll-generate/process all reject Manager;
  advance decisions accept both Officer and Administrator; `generatePayroll` aggregates
  `employee_attendance` hours × the employee's *current* rates, snapshotting both onto the
  `payroll_runs` row (a later rate change never alters a past run); `processPayroll` excludes
  missing-bank rows and flips contributing Approved advances to `deducted`. DB↔portal mapping in
  `employee-map.ts` — unlike `estate-map.ts`/`collection-map.ts`, every enum here uses the *same*
  string on both sides (the DB CHECK constraints were written to match the portal's types
  directly), so it's just id-formatting (`formatEmployeeId`/`parseEmployeeId`, `EMP-0001`-style)
  plus the `PublicEmployee`/`PublicAdvance`/`PublicAttendance`/`PublicPayrollRow` shapes — no
  DB→App conversion tables needed. `employees` is a **new, separate table** from the pre-existing
  `factory_employees` (the auth/permission subtype table for the 3 factory login roles) —
  intentionally unrelated; `hasLogin` on an `employees` row is a stored flag only, since Employee
  self-service login is out of scope for this admin-portal slice (this module never provisions a
  `users` row, unlike Estates' owner-registration flow).
- **Fertilizer** (`src/fertilizer/`): `GET/POST /fertilizer/batches`, `GET /fertilizer/batches/:id`,
  `PATCH /fertilizer/batches/:id/discard`, `GET /fertilizer/positions`, `GET/POST
  /fertilizer/requests`, `GET /fertilizer/requests/:id`, `PATCH /fertilizer/requests/:id/decide`,
  `GET/POST /fertilizer/movements`, all JWT-guarded. Business rules live in
  `fertilizer.service.ts` with unit tests in `fertilizer.service.spec.ts`: the position/coverage
  arithmetic (on-hand/committed/available, Healthy/Tight/Short) is computed here and only here;
  decide is Administrator-only while logging/recording is Officer+ (Manager read-only, same
  three-tier split as the other modules but with an extra approve-vs-edit distinction unique to
  this one); an Outgoing movement's `linkedRequest` is optional (ad-hoc allowed) but when present
  must reference a request with `Approved`/`Partially Dispatched` status and enough remainder, and
  advances `dispatched_qty_kg` + flips status (→ `Partially Dispatched` or `Dispatched`). DB↔portal
  mapping in `fertilizer-map.ts` — same shared-enum, id-formatting-only pattern as
  `employee-map.ts` (`formatBatchId`/`formatMovementId` → `FB-0001`/`MV-0001`;
  `formatRequestId` → `FR-2026-0001`, embedding the request's creation year cosmetically). Reads
  a second `EstateEntity` repository (registered in `fertilizer.module.ts` alongside its own
  entities) purely to resolve estate name + owner id — Estates doesn't model `estate_employees`
  managers at the app layer, so `fertilizer_requests.requested_by` is nullable and always null
  from this module (see Database status below).
- **Reports** (`src/reports/`): `GET /reports/collection`, `GET /reports/revenue`, `GET
  /reports/expenses`, `POST /reports/expenses`, all JWT-guarded, each GET accepting an optional
  `?period=YYYY-MM` (defaults to the latest month with data). Business rules live in
  `reports.service.ts` with unit tests in `reports.service.spec.ts`: collection totals filter to
  **Confirmed** records only; revenue counts only **processed** settlements (`super_kg×super_rate
  + normal_kg×normal_rate`) as realized income; expenses union three sources — Payroll
  (`payroll_runs.gross`) and Fertilizer/Transport (`settlements.fertilizer_deduction`/
  `transport_cost`) computed on the fly, plus manual entries from the new `expense_entries` table
  — and `createExpense` is Officer+ (Manager read-only, same tier as every other module).
  `ReportsModule` registers no entities of its own for aggregation — it binds read-only onto
  `CollectionRecordEntity`/`SettlementEntity`/`PayrollRunEntity` (same second-repository pattern
  Fertilizer used for `EstateEntity`) alongside owning `ExpenseEntryEntity`. `reports-map.ts`
  holds the period-key helpers (`'YYYY-MM'` ↔ `'Month YYYY'` label conversion, since
  `settlements`/`payroll_runs` store the latter) and the `Public*` report shapes; no DB↔portal
  enum mapping is needed since Reports doesn't own a status lifecycle.
- **Audit** (`src/audit/`): cross-cutting `AuditModule` exporting `AuditService`; imported by
  every write module. `record(actor, {action, module, record?, recordHref?, details?})` is
  **best-effort** (try/catch swallows failures — an audit write never breaks the mutation) and
  formats a running `AUD-NNNNN` id. `GET /audit` (module/user/search filters) is
  **Administrator-only** (checked off `req.user.role`, matching the portal's `AdminGuard`). Unit
  tests in `audit.service.spec.ts` cover the shape, the id sequence, the swallow-on-failure
  contract, and filtering.
- **Administration** (`src/admin/`): `GET/POST /admin/grade-rates`, `GET/PUT /admin/permissions`,
  `GET/PUT /admin/settings`, `GET /admin/users`, `POST /admin/users/:id/{suspend,reset-password}`,
  all JWT-guarded and **Administrator-only** (`assertIsAdmin`; `administration: 'approve'`). Owns
  `grade_rates`/`role_permissions`/`system_settings` and binds read/write onto `User` +
  read-only `FactoryEmployee` for the Users tab. `admin-map.ts` holds the shared permission
  vocabulary (`ModuleKey`/`PermissionLevel`/`PortalRole`, mirrored from the portal) and the
  matrix (de)serialisation helpers. `updatePermissions` enforces the immutable-Administrator
  invariant server-side; `createGradeRate` never mutates past rows (newest effective date is
  current); `suspendUser` blocks self-suspend. Unit tests in `admin.service.spec.ts`.
  `AuthService` also binds `RolePermissionEntity` read-only to attach the caller's role map onto
  the login/`/auth/me` response (`PublicUser.permissions`), and rejects a `suspended` login.
- **Seed** (`src/seed.ts`, `npm run seed`, idempotent): three factory users, DEV creds
  `0771234567` / `Password123!` (admin / officer / manager on `…67/68/69`), plus reference
  routes/collection agents, 5 estates (1 inactive, 1 missing-bank) with owners/documents, 3 estate
  advances, 12 settlements (July pending + processed history back to March), 16 collection
  records (July fixture-detail rows plus lightweight Mar–Jun confirmed history for RPT-01's trend
  chart), 6 employees (1 suspended, 1 missing-bank) with pay rates, ~52 July-2026 attendance
  records (covering all four shift-hour buckets), 3 salary advances, a payroll run for July 2026
  computed inline in the script (same aggregation formula `generatePayroll` uses, since the seed
  script has no NestJS DI context to call the real service from) plus 4 static historical payroll
  rows (Mar–Jun) for RPT-03's trend, and 8 fertilizer batches (one intentionally past-expiry,
  reproducing the addendum's TSP-available-−200 showcase), 11 fertilizer requests (5 Approved, 4
  Submitted, 1 Dispatched, 1 Rejected — natural-keyed by `(estate, item, quantity)` for idempotent
  re-seeding, since `fertilizer_requests` has no business-key column), 6 stock movements, and 5
  expense entries (3 July + 2 earlier months, mirroring the old fixture's manual rows) — spanning
  every status each module needs. For Administration: the 33-cell `role_permissions` matrix
  (seeded from the portal's `DEFAULT_PERMISSIONS`, kept in sync via the script's
  `PERMISSION_MATRIX`), 3 `grade_rates` versions (Jan/Apr/Jul 2026), a `system_settings` baseline,
  and 5 `audit_logs` baseline rows so ADM-04 isn't empty on first load (real capture appends from
  there).
- **Config**: `app.module.ts` wires ConfigModule + TypeORM (`synchronize: false`,
  `autoLoadEntities`); `main.ts` has a global ValidationPipe and dev-tolerant CORS (see below).

The pickup-requests / reports / administration modules are still to be written — see `PLAN.md`
Phase 2.5 onward. (Route/Estate/Employee/Fertilizer now have minimal real backing; the full
Route/Pickup request state machine is still mobile-driven, Phase 3.)

**Database (`source-code/database/init.sql`) — auth unblocked, collections reconciled to the
photo-evidence design, estates extended to the full EST-01..09 contract, employees/payroll tables
added from scratch, fertilizer stock tables added and the pre-existing request table extended in
place, broader Route/Pickup reconciliation still pending.** The `users.role`
**and** `factory_employees.role` CHECK constraints were extended (2026-07-21) to include
`factory_officer` and `factory_manager`, so the web portal's two non-admin roles now authenticate
(this was `PLAN.md` Phase 0). On 2026-07-26 the old OTP-based collection lineage —
`tea_selling_requests` → `tea_collection_assignments` → `tea_collection_records` (with
`collection_otp`/`otp_verified`) → `tea_receiving_records` — was **dropped and superseded** by a
single reconciled `tea_collection_records` table matching the finalized **photo evidence only,
never OTP** design (§ Weight verification) and the web portal's status chain 1:1: business-key id
(e.g. `GV-2026-0714`), nullable FKs to `estates`/`routes`/`collection_agents` plus denormalized
display columns, `photos`/`timeline` as JSONB. `complaints.collection_record_id` and
`fertilizer_dispatches.collection_record_id` were retyped to match. This collapsed table
intentionally covers only what the web portal needs; the full Route/Pickup request state machine
(estate-initiated requests, auto-assignment) is mobile-driven and still deferred to `PLAN.md`
Phase 3 — `estate_route_mapping` and the broader `routes`/`route_stops`/`pickup_requests` model
from the domain section above are not yet built. On 2026-07-26 (same day, Estates + Payments
slice) `tea_estate_owners` gained `nic`/`contact`/`email`, and `estates` gained the full EST-01..09
contract (`address`, `route_id`/`route_name`, `self_delivery`, `status`, `ytd_deliveries_kg`,
`bank_name`/`bank_branch`/`bank_account`, audit columns) — `route_id` forward-references `routes`
(defined later in `init.sql`), so its FK constraint is added via a separate `ALTER TABLE` right
after `routes` is created rather than inline. Three new tables: `estate_documents` (metadata only,
same deferred-storage pattern as Collections' photos), `estate_advances`, and `settlements`
(denormalized with snapshot rate/deduction values — no join to `grade_rates` or
`fertilizer_dispatches`, neither exists yet). The pre-existing `monthly_payments` /
`payment_deduction_items` skeleton predates this slice and doesn't match the portal's per-estate
settlement contract — left in place, unused, rather than dropped (see the Payments section
comment in `init.sql`). On 2026-07-26 (same day, Employees + Payroll slice) four tables were added
from scratch, since none of `employee_attendance`/`payroll_runs`/`salary_advances` existed even as
stubs (unlike Estates, which extended an already-decent base): `employees` (the HR roster,
independent of `factory_employees`), `employee_attendance` (one row per employee per day, `UNIQUE
(employee_id, date)`), `salary_advances` (adds a `deducted` boolean alongside the
Pending/Approved/Rejected approval-workflow `status`, so payroll can track which Approved advances
a processed run has already applied), and `payroll_runs` (`UNIQUE (employee_id, period)`, with
`day_rate`/`day_ot_rate`/`night_rate`/`night_ot_rate` and matching hour columns snapshotted at
generation time — same effective-dated-rate principle as `grade_rates`). On 2026-07-27 (Fertilizer
slice) the pre-existing `fertilizer_requests` table — created for a dual owner/factory approval
flow the portal never built — was **extended in place** rather than replaced: added `item`,
`origin`, a portal-matching `status` lifecycle (`Submitted → Approved → Partially Dispatched →
Dispatched → Deducted`, `Rejected`/`Cancelled` terminal), `approved_qty_kg`/`dispatched_qty_kg`,
and `decided_by`/`decided_on`; the legacy `owner_status`/`factory_status` columns stay, defaulted,
for a possible future mobile dual-approval flow. `requested_by` (FK to `estate_employees`, a
manager) was changed **NOT NULL → nullable**, same "nullable because this slice doesn't populate
it" reasoning as `estates`' bank fields — the Estates module never modeled `estate_employees` at
the app layer, and the portal's FERT-07 log-phoned-in-request flow records against an estate, not
a specific manager. Two new tables: `fertilizer_batches` (FEFO-tracked via `expiry_date`, folds
beneficiary items like Rice into the same `category` column rather than a parallel table) and
`stock_movements` (`linked_request_id` nullable by design — ad-hoc dispatch resolved 2026-07-27).
On 2026-07-27 (same day, Reports slice) exactly **one** new table was added — `expense_entries`,
for RPT-04's manual daily-expense entries — the smallest schema footprint of any slice so far,
since RPT-01/02 read existing `tea_collection_records`/`settlements` columns as-is with no
schema change at all. On 2026-07-28 the Administration slice added **four** tables —
`grade_rates` (effective-dated), `role_permissions` (PK `(role, module)`), `system_settings`
(key/`jsonb` value), and `audit_logs` (append-only) — plus two columns on `users` (`status`
`active`/`suspended`, `last_login_at`). Because the dev DB runs `synchronize: false`, the same
changes were applied as a scoped non-destructive migration (`ALTER … ADD COLUMN IF NOT EXISTS`,
`CREATE TABLE IF NOT EXISTS`) against the running instance in addition to landing in `init.sql`.
The local dev DB runs everything in an isolated `tea_authslice` schema; the older, more-advanced
`tea` schema left over from the abandoned test01 branch is untouched.

Infra is already in place and needs no work: `source-code/docker-compose.yml` defines postgres 16,
redis, api, admin, and nginx.

**Mobile (`source-code/mobile/`) — shared shell only on this branch.** Expo project with theme
tokens (`src/theme/`: colors, spacing, typography — note `colors.primary` is the same
`#53cf81` the web portal's hybrid palette is built from) and a minimal `_layout.tsx` +
`index.tsx`. No role-based login, route/pickup/weight/payment flows exist here yet.

## Remaining work (as of 2026-07-28)

**See `PLAN.md` at the repo root for the phased execution roadmap** (schema → auth slice →
module-by-module vertical slices → mobile), with per-phase done-criteria and checkboxes.

**Branch reconciliation is resolved:** `hasindu/mobile/test01` is a **failed branch and is
abandoned** — take nothing from it. All backend, database, and mobile work is built fresh on
this branch. Do not propose merging or cherry-picking from it.

Two facts that shaped the sequencing — **both resolved by the auth slice, and the seam is now
proven end-to-end by the Collections, Estates, Employees, and Fertilizer slices**:

1. **The portal has a data-fetching seam, and all six modules besides auth now prove it holds.**
   It was previously fixture-only (no `services/` layer, zero `useQuery` calls). The auth slice
   built the seam (`src/lib/api.ts` + `src/services/`); Collections (2026-07-26) was the first
   module to actually use it, Estates (2026-07-26, same day) the second — including a money-moving
   write path (advances, settlement processing) — Employees (2026-07-26, same day) the third,
   adding live server-side computation (payroll generation) on top of that pattern for the first
   time — and Fertilizer (2026-07-27) the fourth, the first to extend a pre-existing table in
   place instead of building fresh. Reports (2026-07-27, same day) is the fifth — the first that's
   mostly pure aggregation over other modules' tables. Administration (2026-07-28) is the sixth and
   last, making permissions and audit server-driven. **No web-portal module remains on mock
   fixtures** — only Phase 3 (Mobile) is left; see "Modules, in dependency order" in `PLAN.md`.
   (A few individual pages still keep static config UI where there's no backing table, e.g.
   ADM-01's General Info / Transport / Beneficiary Items tabs — noted in code.)
2. **The schema no longer blocks auth**, and the Collections table is now reconciled to the
   photo-evidence design too. The `users.role` (and `factory_employees.role`) CHECK constraints
   were extended to include `factory_officer` and `factory_manager`, so all three factory roles
   authenticate. `tea_collection_records` was rebuilt 2026-07-26 to drop the old OTP-based lineage
   and match the portal's contract 1:1 (see Database status above). The broader Route/Pickup
   state-machine schema (mobile-driven) is still pending.

Dev-environment note: `main.ts` CORS tolerates Vite's port drift — in dev it accepts any
`localhost`/`127.0.0.1` port (Vite bumps 5173 → 5174 → … whenever a port is taken), while
production stays pinned to `CORS_ORIGIN`. Safe because the JWT rides the `Authorization` header,
not cookies.

Open business items still unresolved: beneficiary-items scope (Rice already flows through the same
`category` column as fertilizer proper, but no policy exists yet for e.g. a different approval
threshold or reporting split). (The ~Rs. 3 bank-charge owner was resolved 2026-07-26, and ad-hoc
vs request-linked fertilizer dispatch was resolved 2026-07-27 — both allowed — see Payment
calculation above and the Fertilizer slice note below.) Deferred a11y polish from the 2026-07-18
review: modal focus trap, DataTable keyboard rows, tab ARIA wiring, Toggle hit area.

Deferred from the Collections slice (2026-07-26), noted as seams rather than gaps: auto-generating
a `complaint` on weight mismatch (currently display-only on the record); Cloudinary photo upload
(the mobile capture path — `photos` is JSONB metadata for now). *(The `audit_logs` seam for Flag
for Correction is now **resolved** — the Administration slice, 2026-07-28, added the real table
and `CollectionsService.flag` writes a row via `AuditService`; the timeline entry is kept too.)*

Deferred from the Estates slice (2026-07-26), noted as seams rather than gaps: settlement
**generation** (currently seeded/process-only — auto-generating a run from live collections needs
`grade_rates` from ADM-01 and Fertilizer dispatch linkage from Phase 2.4, neither built); document
**upload** (`estate_documents` is metadata only, same deferred-storage pattern as Collections'
photos — no Cloudinary yet); estate-owner **login credentials** (a `users` row is provisioned with
a random password on registration, but there's no distribution/reset flow — lands with the mobile
app, Phase 3); EST-09 Analytics stays on mock data; and the `ESTATES` fixture in
`features/estates/data.ts` is still the estate/route/agent source for Collections' exception-entry
flow and Fertilizer's request-logging flow, both out of scope for this slice.

Deferred from the Employees + Payroll slice (2026-07-26), noted as seams rather than gaps:
**employee self-service login** — `Employee.hasLogin` is stored as a flag only; no `users` row is
provisioned and no self-service portal/role exists yet (Claude.md's User roles section scopes this
out of the admin portal; lands whenever mobile/self-service is built, Phase 3 or later); document
**upload** — `Employee` has no `documents` field at all (unlike `EstateOwner`), so
`employee_documents` wasn't built and the registration wizard's Documents step stays decorative;
**"other" payroll deductions** — `deductions.other` is always `0`, there's no source feeding it yet
(no equivalent of Estates' fertilizer-deduction linkage for employees); **bank payment file
export** — the "Bank File" button on `PayrollListPage` is still a toast stub, same deferred-export
pattern as Collections/Estates; and EMP-14 Performance stays on mock data (same call as EST-09).

Deferred from the Fertilizer slice (2026-07-27), noted as seams rather than gaps: **settlement
linkage** — "feeds the estate settlement deduction breakdown" means a `Deducted` request should
flow into `fertilizer_charges` → `settlements.fertilizer_deduction`, but settlement generation
itself is still seeded/process-only (deferred from the Estates slice, needs `grade_rates` from
ADM-01 too) — this slice only produces the `Deducted` status, the charge-row/settlement wiring
lands whenever settlement auto-generation does; **new-batch category** — `StockMovementEntryPage`'s
quick "+ New batch" path (Incoming, no existing batch selected) has no category selector and
always creates a `Fertilizer` batch — registering a new `Beneficiary` (e.g. Rice) batch needs
`POST /fertilizer/batches` directly, not this form; **request logging date** — `LogRequestPage`'s
"Requested date" field is validated client-side but not sent; the backend always stamps a logged
request with "now" (there's no backdating field yet); and **dual owner/factory approval** — the
DB's `owner_status`/`factory_status` columns on `fertilizer_requests` stay unused by this slice
(portal approval runs off the single `status` lifecycle instead), reserved for a possible future
mobile owner-approval step.

Deferred from the Reports slice (2026-07-27), noted as seams rather than gaps: **live grade-rate
revenue** — RPT-02 reads settlements' *snapshot* rates, same as Estates. *(The `grade_rates` table
itself now exists as of the Administration slice, 2026-07-28, but a RPT-02 variant that recomputes
off it is still deferred — and by design settlements keep their snapshot rate so past revenue
never moves.)* **available-periods
endpoint** — the portal's period filter is a hardcoded `REPORT_PERIODS` list (the five seeded
months) rather than a "what periods have data" call, since each report already defaults sensibly
to its own latest month when no period is given; **export/print/schedule/share** — `ReportActionsBar`'s
buttons stay demo toasts, same deferred-export pattern as Collections/Estates/Employees' bank-file
buttons; **receipt upload** — RPT-04's receipt dropzone stays decorative, same deferred-storage
pattern as Collections' photos / Estates' documents; and **quarter-range periods** — the old
fixture's "Q2 2026" period option was dropped rather than wired, since aggregating a quarter needs
a range parameter the backend doesn't accept yet (single `YYYY-MM` only).

Deferred from the Administration slice (2026-07-28), noted as seams rather than gaps: **password
reset delivery** — `POST /admin/users/:id/reset-password` records an audit entry but sends no email
(no email/SMS infra until Phase 3; the UI frames it as "a reset link is emailed"); **user
reactivation** — suspend is one-way in the UI (a suspended account is un-suspended only by a direct
DB update this slice); **ADM-01 non-rate config** — the Factory Setup General Info / Transport
Rates / Beneficiary Item tabs have no backing table yet and stay demo saves (only grade rates
persist); **audit-log export** — ADM-04's "Export CSV / PDF" button is still a demo toast; **audit
`user_id`** — `AuditService` stamps the human-facing `user_name`/`role` always but leaves
`user_id` null for the existing modules' `Actor` (which carries no `sub`); only the Admin module
passes it; and **per-user permission overrides** — permissions are per-*role*, not per-user (the
matrix edits a role's row; there's no per-account exception), matching the original three-role
model.
