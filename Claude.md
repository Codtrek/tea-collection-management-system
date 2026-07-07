# Tea Collection Management System — Project Context

This file gives an AI coding assistant the working context needed to write code consistent
with the finalized design decisions for this project. It reflects design sessions held after
the original project proposal was written — where this file conflicts with the proposal PDF,
**this file is authoritative** for implementation purposes.

## What this system does

Digitizes Sri Lanka's manual, paper-based tea collection workflow: from leaf plucking at the
estate, through factory pickup and receiving, to monthly payment calculation. Replaces phone
calls and paper records with a coordinated mobile + web system.

## Stack

- **Mobile app**: React Native, offline-first via SQLite, syncs to backend when online
- **Web portal**: React + Vite
- **Desktop app**: planned, not yet architected (added after original proposal — scope/role
  mapping still open)
- **Backend**: NestJS (Node.js), REST API
- **Database**: PostgreSQL (primary), SQLite (mobile offline), Redis (caching)
- **Auth**: JWT, role-based access control
- **Storage**: Cloudinary (photo evidence)
- **Maps**: Google Maps API (static route/proximity display, not live tracking)
- **i18n**: English, Sinhala, Tamil (react-i18next)

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

**Resolved (2026-07-06)**: the ~Rs 3 bank charge is a **per-transaction transfer fee**, deducted
from each payee's net payable. `init.sql`'s `monthly_payments.bank_transfer_fee` and the
`bank_fee` `payment_deduction_items.deduction_type` reflect this.

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

---

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

## Use case ID map (for cross-referencing the proposal document)

- **Deleted**: UC-036 (old Factory Admin review step — requests no longer go through review,
  they route directly via the active-route collector)
- **Rewritten in place**: UC-009 (Create Pickup Request), UC-010 (Handle Pickup Rejection or
  Expiry), UC-037 (View Route Availability — now Estate Owner–facing, not Factory Admin–facing)
- **New (route/pickup)**: UC-053–UC-057, UC-064–UC-068 — route creation, status updates, Start
  Route, route dashboard, weight-mismatch auto-flagging, auto-assignment, request expiry,
  per-stop accept/decline, route-start/delay/cancel notifications
- **New (factory management)**: UC-058–UC-063 — on-device weight confirmation, manual collection
  entry, tea grading, monthly payment calculation, salary advance requests, bank payment file
  generation

## Implementation status

- **Mobile app**: shared navigation shell (role-based login, tab shell) plus complete, tested
  **Route Management**, **Pickup Management**, **Weight entry/verification**, and
  **Payment calculation** flows (2026-07-07) — see `source-code/mobile/CLAUDE.md` for the full
  architecture (domain state machines, `AsyncDb` test-injection pattern, screens) and hard-won
  testing-setup gotchas. Payment calculation (`GeneratePaymentScreen` for factory admins,
  `PaymentStatementsScreen` for estate owners) aggregates graded received weight per
  owner/factory/month, excludes self-delivered estates from transport cost, and applies the
  per-transaction bank transfer fee. Photo capture/Cloudinary upload for weight evidence is
  stubbed as a nullable `evidence_url` — wire it together with the offline queue.
  The mobile role-naming gap (`'collection_agent'` vs `'collector'`) was fixed 2026-07-07.
- **Backend bootstrapped (2026-07-07)**: `source-code/backend/` has a real `ConfigModule` +
  `TypeOrmModule` (`synchronize: false`, since `init.sql` owns the schema) connected to Postgres,
  a `User` entity, and a full JWT auth flow (`POST /auth/login`, `GET /auth/me`, `RolesGuard` +
  `@Roles(...)` ready for the 8 roles), plus complete **Route Management**
  (`src/routes/`: entities, `RoutesService`, `RoutesController`) and **Pickup Management**
  (`src/pickup-requests/`: `PickupRequestEntity`, `PickupRequestsService` with
  one-active-request-per-day check + auto-assignment to the collector ACTIVE on the estate's
  route today, role-guarded `PickupRequestsController`) modules, both verified end-to-end
  against a live Postgres instance including role guards, DTO validation, and (for routes) the
  notify-on-transition fan-out. Note: "decline" is stored as status `'cancelled'` +
  `decline_reason` — the schema has no separate `declined` status.
  A **Collection Records module** (`src/collection-records/`) is also complete and E2E-verified
  (2026-07-07): collector creates a weight record (`POST /collection-records`, manual records
  supported via optional `pickupRequestId`), owner confirms on the collector's device
  (`POST /:id/confirm-owner`), receiving officer lists pending (`GET /pending`) and re-weighs +
  grades (`POST /:id/receive`) — receiving auto-completes the linked pickup request and
  auto-raises a `weight_mismatch` complaint when the difference exceeds
  `DEFAULT_WEIGHT_MISMATCH_THRESHOLD_KG` (2 kg, in `collection-status.util.ts`).
  `source-code/backend/.env.example` documents local-dev env vars;
  `source-code/database/seed.sql` seeds demo users mirroring the mobile app's 8 demo accounts.
  A **Payments module** (`src/payments/`) is also complete and E2E-verified (2026-07-07):
  factory admins generate a monthly payment (`POST /payments`) which aggregates super/normal
  received weight for an owner+factory+month from `tea_receiving_records`/`tea_collection_records`
  (excluding self-delivered estates from transport cost), rejects duplicates and zero-weight
  months, and applies the per-transaction `bank_transfer_fee`; `POST /:id/finalize` transitions
  `pending` → `finalized` (once only); `GET /payments` lists all (factory admin) and
  `GET /payments/mine` resolves the caller's `tea_estate_owners` id from the JWT and lists their
  own statements. Pure calculation logic lives in `payment-calculation.util.ts`, mirroring the
  mobile `src/domain/payment.ts`. Feature module for `employees` is **not built yet** —
  deliberately deferred (needs the generic HR employee record noted below).
- **Database schema reconciled (2026-07-06)**: `source-code/database/init.sql` previously
  predated and conflicted with the design decisions in this file; it has been rewritten to match
  (verified by applying it to a real Postgres 17 instance). Role enums now use the 8-role list
  exactly, all OTP columns/notification type were removed in favor of `owner_confirmed` +
  `evidence_url`, and the old `tea_selling_requests`/`tea_collection_assignments` model was
  replaced with real `routes`/`route_stops`/`pickup_requests` tables matching the Route vs.
  Pickup state machines above (including the one-active-pickup-per-estate-per-day constraint and
  `tea_grade` on receiving records). Payment tables gained `transport_cost`, `advance_deductions`,
  and `bank_transfer_fee` line items. `init.sql` can now be treated as ground truth for this
  domain. **Not yet modeled, intentionally deferred**: employee payroll
  (`Attendance`/`SalaryAdvance` for staff) needs a generic HR employee record spanning login and
  non-login roles that doesn't exist yet — that's the next schema task, not a gap to patch around.
  Backend modules (NestJS entities/auth/ORM) still need to be built against this schema.

## Remaining work (priority order, as of 2026-07-07)

1. ~~Reconcile `init.sql` with this file~~ — done 2026-07-06 (see above).
2. ~~Bootstrap the NestJS backend~~ — done 2026-07-07 (see above).
3. ~~Fix the mobile role-naming gap~~ — done 2026-07-07.
4. ~~Route Management~~ (mobile + backend) — done 2026-07-07 (see above). Pattern to follow for
   the next flows: domain state machine (pure functions) → DI-testable service → screens/backend
   module → wire into router/module → verify end-to-end against real Postgres.
5. ~~Pickup Management~~ (mobile + backend) — done 2026-07-07 (see above).
6. ~~Weight entry/verification~~ (mobile + backend) — done 2026-07-07 (see above). Photo
   capture/Cloudinary upload intentionally deferred to the offline-queue work (`evidence_url`
   is nullable and plumbed through end to end).
7. ~~Payment calculation~~ (mobile + backend) — done 2026-07-07 (see above). Bank payment file
   export (an actual downloadable Excel/CSV/PDF, `payment_statements.file_url`) was not built —
   only the underlying `monthly_payments` data; treat file export as a small follow-up if needed.
8. ~~Offline queue~~ (mobile) — done 2026-07-07. Scoped to the one write path that genuinely
   needs it today: weight-evidence photo upload (`tea_collection_records.evidence_status`:
   `'none' | 'queued_offline' | 'uploaded'`, plus a generic `sync_queue` table). See mobile
   `CLAUDE.md` for the architecture. Real Cloudinary upload is still a stub
   (`https://stub-evidence.local/...` URLs) pending credentials; the queue/retry mechanism
   itself is real and tested. Other write paths (routes, pickup, collection, payments) don't
   need offline queuing since they're plain local SQLite writes that always succeed regardless
   of connectivity — the app doesn't call the backend API from the device yet at all.
9. ~~Diagram redraws~~ — done 2026-07-07 (see below). No editable source existed for the original
   PNGs, so new `.drawio` files were hand-authored instead of edited in place.

## Diagram redraws (2026-07-07)

Figures 2, 5, and 6 in the original proposal (Tea Estate Owner, Tea Receiving Officer, Factory
Administrator use case diagrams) showed the old OTP-based flow and pre-route responsibilities.
New source files were authored at
`project-docs/project-proposal/attachements/use_case_diagrams/usecase-tea-{estate-owner,receiving-officer,factory-administration}.drawio`
(valid mxGraph XML, opens directly in diagrams.net/Draw.io) alongside the original PNGs, which
were left in place for reference. Content changes:
- **Tea Estate Owner**: replaced "Submit tea leaf selling request" with "Create Pickup Request";
  removed "Approve or Reject Selling Requests" (no owner-approval step — pickup requests
  auto-assign to whichever collector is active on the estate's route); added "View Route
  Availability" (UC-037, moved here from Factory Admin) and "Confirm Weight on Collector's
  Device" (replaces OTP confirmation). Everything else (employee/fertilizer/reporting use cases)
  is unaffected by the route/OTP redesign and was kept as-is.
- **Tea Receiving Officer**: fully reworked from the 3-ellipse OTP flow ("Generate OTP from Tea
  Collection Agent" → "Confirm via OTP" → "Submit Complaint Reports") to "View Pending
  Collections" → "Re-weigh Tea at Factory" (includes viewing the list and assigning grade) →
  "Assign Tea Grade (Super/Normal)", plus "Auto-flag Weight Mismatch Complaint" as an
  `<<extend>>` on re-weighing. "Submit Complaint Reports" kept for manual complaints.
  This diagram had no OTP-unrelated content, so the rework is a near-total replacement.
- **Factory Administrator**: removed "Approve or Reject tea leaf collection request" (deleted
  UC-036 — requests no longer go through factory review) and both duplicate "Check the
  availability of Tea collection agents" ellipses (that responsibility moved to the Estate
  Owner's "View Route Availability" above); also deduplicated an accidentally-doubled "Calculate
  Fertilizer Charges" ellipse. Added "Create Route", "Update Route Status (Delay/Cancel with
  Reason)", and "View Route Dashboard" for the factory-only Route Management responsibilities.
  Fertilizer/payment/complaint use cases were unaffected and kept as-is.

**Caveat**: these were hand-authored XML, not visually verified by rendering (no Draw.io/image
tooling available in this environment) — content and relationships were carefully checked (no
dangling edge references, verified via script), but layout/spacing may need minor polish when
opened in diagrams.net. The original PNGs remain in the same directory and are still what
`sections/system_design.tex` embeds — re-export the `.drawio` files to PNG and update the
`\includegraphics` paths there once the layout is confirmed acceptable.
