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
stock-position rework + dev-CORS fix (in progress on `feature/fertilizer-stock-position`).

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
also exportable as a bank payment file.

The ~Rs. 3 per-transaction bank charge is a **per-transaction transfer fee**, deducted from each
payee's net payable (resolved design decision — don't model it as a flat file-processing fee).

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
the ~Rs. 3 bank charge is displayed as an unresolved note in EST-08 (never deducted); grade
rates are versioned by effective date so past settlements never recalculate; reports aggregate
Confirmed collection records only. Permissions stay data-driven (`src/context/permissions.ts`).
Most data is still mock (`features/*/data.ts`), shaped to match a future REST contract — wiring the
remaining modules to the real backend is the remaining web-portal work. `ComingSoon` stub was
removed. Build + lint clean. See `source-code/admin/AGENTS.md` for conventions.

**Auth is now wired to the real backend (2026-07-21, `feature/auth-slice`).** The data-fetching
seam the roadmap called for now exists: `src/lib/api.ts` (typed `ApiError`, attaches the JWT,
maps 401 → logout, and turns a network failure into a diagnostic "backend unreachable" message)
plus `src/services/auth.ts`. `AuthContext` performs real JWT login and hydrates the session via
`GET /auth/me` on load. Login is **phone + password** (not email), with per-field validation and a
password-reveal (eye) toggle in `LoginPage`.

**Fertilizer Inventory reworked (2026-07-22, `feature/fertilizer-stock-position`, in progress).**
Per the fertilizer addendum, the module now distinguishes **On hand ≠ Available**
(`Available = On hand − Committed − Expired`) to prevent over-commitment. The
`onHand − committed` math lives in exactly one place — the single-source-of-truth
`features/fertilizer/position.ts`. Added the request workflow: FERT-05 request queue, FERT-06
request detail (approval with FEFO allocation + override), FERT-07 log-phoned-in request; plus
FERT-02 (stock movement now request-linked unless ad-hoc + reason) and FERT-04 (alerts show
demand coverage) amendments, with routing and a "Fertilizer Requests" nav item. Still mock data.

**Backend (`source-code/backend/`) — real auth slice built (2026-07-21), rest still to come.**
The default NestJS scaffold (`app.controller.ts`, `app.service.ts`, their spec, and the e2e test)
was **deleted**; `package.json` now depends on TypeORM, pg, @nestjs/jwt, passport-jwt, bcrypt, and
class-validator. Built:
- **Auth** (`src/auth/`): `POST /auth/login` (phone + password → JWT) and `GET /auth/me`; JWT
  payload is `{sub, role}`. Login errors are situational (phone-not-found vs. wrong-password).
  DB-role → app-role mapping in `src/auth/role-map.ts` (`factory_admin→Administrator`,
  `factory_officer→Officer`, `factory_manager→Manager`; non-factory roles are rejected).
- **Users** (`src/users/`): User / Factory / FactoryEmployee entities + service; users are keyed
  by **phone**, not email; the profile join reaches `factory_employees → factories`.
- **Seed** (`src/seed.ts`, `npm run seed`): three factory users, DEV creds
  `0771234567` / `Password123!` (admin / officer / manager on `…67/68/69`).
- **Config**: `app.module.ts` wires ConfigModule + TypeORM (`synchronize: false`,
  `autoLoadEntities`); `main.ts` has a global ValidationPipe and dev-tolerant CORS (see below).

The routes / pickup-requests / collection-records / payments modules are still to be written — see
`PLAN.md` Phase 1 onward.

**Database (`source-code/database/init.sql`) — auth unblocked, broader reconciliation still
pending.** The `users.role` **and** `factory_employees.role` CHECK constraints were extended
(2026-07-21) to include `factory_officer` and `factory_manager`, so the web portal's two non-admin
roles now authenticate (this was `PLAN.md` Phase 0). The schema still has the old
`tea_selling_requests`/`tea_collection_assignments`/`estate_route_mapping` model, not the
`routes`/`route_stops`/`pickup_requests` state machines described above — that reconciliation is
still to come. The local dev DB runs the auth slice in an isolated `tea_authslice` schema; the
older, more-advanced `tea` schema left over from the abandoned test01 branch is untouched.

Infra is already in place and needs no work: `source-code/docker-compose.yml` defines postgres 16,
redis, api, admin, and nginx.

**Mobile (`source-code/mobile/`) — shared shell only on this branch.** Expo project with theme
tokens (`src/theme/`: colors, spacing, typography — note `colors.primary` is the same
`#53cf81` the web portal's hybrid palette is built from) and a minimal `_layout.tsx` +
`index.tsx`. No role-based login, route/pickup/weight/payment flows exist here yet.

## Remaining work (as of 2026-07-22)

**See `PLAN.md` at the repo root for the phased execution roadmap** (schema → auth slice →
module-by-module vertical slices → mobile), with per-phase done-criteria and checkboxes.

**Branch reconciliation is resolved:** `hasindu/mobile/test01` is a **failed branch and is
abandoned** — take nothing from it. All backend, database, and mobile work is built fresh on
this branch. Do not propose merging or cherry-picking from it.

Two facts that shaped the sequencing — **both now resolved by the auth slice**:

1. **The portal now has a data-fetching seam.** It was previously fixture-only (no `services/`
   layer, zero `useQuery` calls). The auth slice built that seam — `src/lib/api.ts` +
   `src/services/` — so wiring the remaining modules is now *using* it, not building it. TanStack
   Query is still installed and `QueryClientProvider` wired in `src/main.tsx` for that follow-on
   work; the rest of the pages still import static fixtures until each is migrated.
2. **The schema no longer blocks auth.** The `users.role` (and `factory_employees.role`) CHECK
   constraints were extended to include `factory_officer` and `factory_manager`, so all three
   factory roles authenticate. The broader routes/pickup schema reconciliation is still pending.

Dev-environment note: `main.ts` CORS tolerates Vite's port drift — in dev it accepts any
`localhost`/`127.0.0.1` port (Vite bumps 5173 → 5174 → … whenever a port is taken), while
production stays pinned to `CORS_ORIGIN`. Safe because the JWT rides the `Authorization` header,
not cookies.

Open business items still unresolved and surfaced in the UI: bank-charge owner, ad-hoc vs
request-linked fertilizer dispatch, beneficiary-items scope. Deferred a11y polish from the
2026-07-18 review: modal focus trap, DataTable keyboard rows, tab ARIA wiring, Toggle hit area.
